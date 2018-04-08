'use latest';
import githubUrlFromGit from 'github-url-from-git';
import sendgrid from 'sendgrid';
const helper = sendgrid.mail;

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
    const { BUILDKITE_TOKEN } = context.secrets;

    if (!BUILDKITE_TOKEN) {
        cb(new Error(`BUILDKITE_TOKEN secret not set or empty`));
        return;
    }

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
        repo,
    };

    switch (state) {
        case 'passed':
            // remove any stored culprits for the current pipeline
            transformStorage(context, clearPipeline.bind(null, currentCulprit))
                .then(() => cb())
                .catch(cb);
            break;
        case 'failed':
            // store culprits and send Email
            transformStorage(context, storeCulprit.bind(null, currentCulprit))
                .then((data) => {
                    const {
                        culprits
                    } = data.pipelines[fullSlug(currentCulprit)];
                    return sendEmail(context, culprits, currentCulprit, buildUrl, pipelineName);
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

function sendEmail(context, culprits, currentCulprit, buildUrl, pipelineName) {
    const { slug, name, email, number } = currentCulprit;
    const subject = `🧙 Elves and dragons! ${pipelineName} (${slug}) failed (#${number})`;

    const list = culprits.map(({ repo, sha, message, name, number  }) => {
        const githubUrl = `${githubUrlFromGit(repo)}/commit/${sha}`;
        return `* ${message} [${name}, ${sha.substring(0,6)}, ${githubUrl}, failing since #${number}]`;
    }).join('\n');

    const content = `Farewell ${name}!

What in the Shire is that?

I hope that you’ll not take it amiss, but it seems you may have broken
${pipelineName} (${slug})
in build #${number}: ${buildUrl}
via:

${list}

Timely fixing will go down like lembas bread :)

Your good health!
Bilbo
`;
    return send(context, email, subject, content);
}

function send(context, to, subject, content) {

    const { SENDGRID_API_KEY, SENDER_EMAIL_ADDRESS: email } = context.secrets;

    const mail = new helper.Mail(
    { name: 'Bilbo', email },
    subject,
    new helper.Email(to),
    new helper.Content('text/plain', content)
  );
  const sg = sendgrid(SENDGRID_API_KEY);
  const request = sg.emptyRequest({
    method: 'POST',
    path: '/v3/mail/send',
    body: mail.toJSON()
  });
  return sg.API(request);
}

function transformStorage(ctx, transformFn) {
    return new Promise((resolve, reject) => {
        ctx.storage.get(function (error, data) {
            if (error) {
                reject(error);
                return
            }
            data = transformFn(data);
            var attempts = 3;
            ctx.storage.set(data, function set_cb(error) {
                if (error) {
                    if (error.code === 409 && attempts--) {
                        // resolve conflict and re-attempt set
                        data = transformFn(error.conflict);
                        return ctx.storage.set(data, set_cb);
                    }
                    reject(error);
                    return
                }
                resolve(data);
                return;
            });
        });
    });
}
