'use latest';
import sendEmail from './sendEmail.js';
import transformStorage from './transformStorage.js';

/**
 * The org should really come as part of the webhook payload,
 * but for some reason it is missing, so we extract it from an
 * API url, such as
 * https://api.buildkite.com/v2/organizations/my-org/pipelines/my-slug/builds/999
 */
function getBuildkiteOrgFromApiUrl(url) {
    return url.match(/organizations\/(.*?)\//)[1];
}

function fullSlug({
    org,
    slug,
}) {
    return `${org}/${slug}`;
}

/**
 * @param context {WebtaskContext}
 */
module.exports = (context, cb) => {

    const {
        SENDGRID_API_KEY,
        BUILDKITE_TOKEN,
    } = context.secrets;

    if (!('x-buildkite-token' in context.headers) || context.headers['x-buildkite-token'] !== BUILDKITE_TOKEN) {
        cb(new Error('Missing or incorrect Buildkite token'));
        return;
    }
    if (!context.body) {
        cb(new Error('Wrong Content-Type?'));
        return;
    }

    const {
        event,
    } = context.body;
    switch (event) {
        case 'ping':
            cb(null, 'pong');
            return;
        case 'build.finished':
            // this is the only other one we want to handle
            break;
        default:
            cb(new Error(`Unknown Buildkite event '${event}'`));
            return;
    }

    const {
        build: {
            state,
            web_url: buildUrl,
            number,
            message,
            commit: sha,
            creator: {
                name,
                email,
            },
        },
        pipeline: {
            name: pipelineName,
            url: pipelineUrl,
            slug,
            repository: repo,
        }
    } = context.body;

    // we want to keep this data structure small,
    // because we only have 500k in webtask
    const currentCulprit = {
        org: getBuildkiteOrgFromApiUrl(pipelineUrl),
        slug,
        name,
        email,
        sha,
        message,
        number,
    };

    switch (state) {
        case 'passed':
            // remove any stored culprits for the current pipeline
            transformStorage(context, clearPipeline.bind(currentCulprit))
                .then(() => cb())
                .catch(cb);
            break;
        case 'failed':
            // store culprits and send Email
            transformStorage(context, storeCulprit.bind(currentCulprit))
                .then((data) => {
                    const {
                        culprits
                    } = data.pipelines[fullSlug(currentCulprit)];
                    return sendEmail(context, culprits, currentCulprit, buildNumber, pipelineName);
                })
                .then(() => cb())
                .catch(cb);
            break;
        default:
            // not interested in this state, but won't fail the hook
            cb();
            return;
    }
};


function storeCulprit(culprit, data) {
    const slug = fullSlug(culprit);
    data = data || {};
    data.pipelines = data.pipelines || {}
    data.pipelines[slug] = data.pipelines[slug] || {};
    data.pipelines[slug].culprits = data.pipelines[slug].culprits || [];
    if (!data.pipelines[slug].culprits.some(({
            sha
        }) => sha === culprit.sha)) {
        // we only add a culprit to the list if we don't have it yet
        // failing reruns of the same commit are not added to the list
        data.pipelines[slug].culprits.unshift(culprit);
    }
    return data;
}

function clearPipeline(culprit, data) {
    const slug = fullSlug(culprit);
    data = data || {};
    data.pipelines = data.pipelines || {};
    delete data.pipelines[slug];
    return data;
}
