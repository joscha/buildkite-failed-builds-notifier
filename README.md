# Bilbo, the buildkite failed builds notifier
A [Buildkite](http://www.buildkite.com) webhook that sends out an email to people that potentially have failed a build.

It looks like this:

<img width="738" alt="inbox" src="https://user-images.githubusercontent.com/188038/38464447-79bbcffc-3b51-11e8-91db-94c7bb0a348c.png">

<img width="1013" alt="details" src="https://user-images.githubusercontent.com/188038/38464445-7063a2e0-3b51-11e8-92a4-90c1316f2afc.png">

Failures stack:

<img width="981" alt="stacked" src="https://user-images.githubusercontent.com/188038/38464517-54b8973e-3b52-11e8-9c01-0bb5bf55f47d.png">

until the build passes, at which the culprits are reset.

It uses the [Buildkite webhooks](https://buildkite.com/docs/webhooks/integrations) and [webtask.io](https://webtask.io/).

## Assumptions

* The culprits are stored per pipeline, so only one branch can be used for each pipeline, e.g. `master`. If you want to track culprits between builds in multiple branches, you need to set up separate webtasks.
*  Only the current person triggering the Buildkite pipeline will be notified, assuming all others have been notified in the builds before. This will not work for commits which use `[skip ci]` or `[ci skip]`.
* Pipelines are tracked with their organization, so you can use one webtask with multiple organizations, even if you have pipelines with the same name.
* The commit shas, the commit message, the email and name of the triggering person and some other data is stored in the webtask storage. For what is stored, [see here](https://github.com/joscha/buildkite-failed-builds-notifier/blob/92d7b4f63a79c123127a61d64683df3ce74047cc/failed-builds-notification.js#L80-L89).
* TODO: in case an older build on the same pipeline that is passed after failure (by reruns for example), it removes the recorded failed state currently. Ideally the state would be kept, from the failing build upwards.

## Installation
Via [wt-cli](https://github.com/auth0/wt-cli):

```sh
wt create https://raw.githubusercontent.com/joscha/buildkite-failed-builds-notifier/master/failed-builds-notification.js \
          --name bilbo \
          --secret SENDGRID_API_TOKEN=<SENDGRID_API_TOKEN> \
          --secret MANDRILL_API_KEY=<MANDRILL_API_KEY> \
          --secret BUILDKITE_TOKEN=<BUILDKITE_TOKEN> \
          --secret SENDER_EMAIL_ADDRESS=me@domain.com \
          --dependency github-url-from-git@1.5.0 \
          --dependency sendgrid@5.2.3
```

You need either `SENDGRID_API_TOKEN` or `MANDRILL_API_KEY`. If both given, Mandrill will be preferred.

## Needed modules
```sh
wt modules add github-url-from-git@1.5.0
wt modules add sendgrid@5.2.3
wt modules add mandrill-api@1.0.45
```

## Needed secrets:

* Either `SENDGRID_API_TOKEN`: Create a [new API token](https://app.sendgrid.com/settings/api_keys) and give it full access for `Mail Send`: <img width="500" alt="Mail Send" src="https://www.evernote.com/shard/s5/sh/18981443-3469-410b-8f42-a6d207876dc0/28370d37212e1024/res/daf7d7f8-a2b5-4f3d-be83-3cc6cb189e0a/skitch.png">
* Or: `MANDRILL_API_KEY`: Create a new [API key](https://www.mandrill.com/)


* `BUILDKITE_TOKEN`: from your Buildkite [webhook settings](https://buildkite.com/organizations/your-org/services/webhook/new): <img width="500" alt="Token" src="https://www.evernote.com/shard/s5/sh/90cdaa51-1228-4fde-9946-d8528d667068/f525470a8a87aa67/res/fabcaa5f-3130-4458-b93f-9621f2480e24/skitch.png">
* `SENDER_EMAIL_ADDRESS`: The email address that is used by the email provider to generate the build fail emails.


## Email settings

### Sendgrid

#### Disable click tracking

<img width="500" alt="Click tracking" src="https://www.evernote.com/shard/s5/sh/b9c38491-b076-4a19-8957-442d68ec5a7f/631fd8ed08c085ff/res/65be894a-7e1f-4f48-925a-8687e78b99fb/skitch.png">
otherwise the URLs in the plain text email become really long.

#### Enable plain content

<img width="500" alt="Plain Content" src="https://www.evernote.com/shard/s5/sh/3bc8c825-b307-41d8-8c98-ffe82a735b29/6d1a8794ea5158c5/res/c58ef61f-739a-4c96-92d5-5eaffd902eb4/skitch.png">
otherwise the plain text will be automatically converted to HTML by sendgrid and the formatting will be off.

## Buildkite webhook settings

### Enable the `ping` and `build.finished` events:

<img width="500" alt="Events" src="https://www.evernote.com/shard/s5/sh/1b02a9be-c6f2-42ab-9055-bc3d1a29e605/5881436703a458d2/res/800e9d0a-6599-4ba0-8195-4c3e9bff735a/skitch.png">


## Test

You can test the webtask with this snippet:
```json
{
  "event": "build.finished",
  "build": {
    "web_url": "https://buildkite.com/some-org/some-pipeline/builds/1",
    "number": 1,
    "state": "failed",
    "message": "Some build message",
    "commit": "c0ffeec0ffeec0ffeec0ffeec0ffeec0ffeec0ff",
    "creator": {
      "name": "Mister Test",
      "email": "your@email.com"
    }
  },
  "pipeline": {
    "name": "Some pipeline",
    "url": "https://api.buildkite.com/v2/organizations/some-org/pipelines/some-pipeline",
    "slug": "some-pipeline",
    "repository": "git@github.com:some/repo.git"
  }
}
```

> Important: Be sure to replace `your@email.com` with your own email, to actually receive anything.

Don't forget to send this as JSON (`Content-Type: application/json`) and also pass your Buildkite token via the `X-Buildkite-Token` header. You can replace `"state": "failed"` with `"state": "passed"` to simulate a passed build run.
