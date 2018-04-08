# Bilbo, the buildkite failed builds notifier
A [Buildkite](http://www.buildkite.com) webhook that sends out an email to people that potentially have failed a build.

It looks like this:

<img width="738" alt="inbox" src="https://user-images.githubusercontent.com/188038/38464447-79bbcffc-3b51-11e8-91db-94c7bb0a348c.png">

<img width="1013" alt="details" src="https://user-images.githubusercontent.com/188038/38464445-7063a2e0-3b51-11e8-92a4-90c1316f2afc.png">

Failures stack:

<img width="981" alt="stacked" src="https://user-images.githubusercontent.com/188038/38464517-54b8973e-3b52-11e8-9c01-0bb5bf55f47d.png">

until the build passes, at which the culprits are reset.

Caveat: Only the current person triggering the Buildkite pipeline will be notified, assuming all others have been notified in the builds before. This will not work for commits which use `[skip ci]` or `[ci skip]`.

## Installation
Via [wt-cli](https://github.com/auth0/wt-cli):

```sh
wt create https://raw.githubusercontent.com/joscha/buildkite-failed-builds-notifier/master/failed-builds-notification.js \
          --name bilbo \
          --secret SENDGRID_API_TOKEN=<SENDGRID_API_TOKEN> \
          --secret BUILDKITE_TOKEN=<BUILDKITE_TOKEN> \
          --secret SENDER_EMAIL_ADDRESS=me@domain.com \
          --dependency github-url-from-git@1.5.0 \
          --dependency sendgrid@5.2.3
```


## Needed modules
```sh
wt modules add github-url-from-git@1.5.0
wt modules add sendgrid@5.2.3
```

## Needed secrets:
* `SENDGRID_API_TOKEN`: Create a [new API token](https://app.sendgrid.com/settings/api_keys) and give it full access for `Mail Send`: <img width="500" alt="Mail Send" src="https://www.evernote.com/shard/s5/sh/18981443-3469-410b-8f42-a6d207876dc0/28370d37212e1024/res/daf7d7f8-a2b5-4f3d-be83-3cc6cb189e0a/skitch.png">

* `BUILDKITE_TOKEN`: from your Buildkite [webhook settings](https://buildkite.com/organizations/your-org/services/webhook/new):
<img width="500" alt="Token" src="https://www.evernote.com/shard/s5/sh/90cdaa51-1228-4fde-9946-d8528d667068/f525470a8a87aa67/res/fabcaa5f-3130-4458-b93f-9621f2480e24/skitch.png">

* `SENDER_EMAIL_ADDRESS`: The email address that is used by sendgrid to generate the build fail emails.


## Sendgrid settings:

### Disable click tracking

<img width="500" alt="Click tracking" src="https://www.evernote.com/shard/s5/sh/b9c38491-b076-4a19-8957-442d68ec5a7f/631fd8ed08c085ff/res/65be894a-7e1f-4f48-925a-8687e78b99fb/skitch.png">
otherwise the URLs in the plain text email become really long.

### Enable plain content

<img width="500" alt="Plain Content" src="https://www.evernote.com/shard/s5/sh/3bc8c825-b307-41d8-8c98-ffe82a735b29/6d1a8794ea5158c5/res/c58ef61f-739a-4c96-92d5-5eaffd902eb4/skitch.png"> otherwise the plain text will be automatically converted to HTML by sendgrid and the formatting will be off.

## Buildkite webhook settings

### Enable the `ping` and `build.finished` events:

<img width="500" alt="Events" src="https://www.evernote.com/shard/s5/sh/1b02a9be-c6f2-42ab-9055-bc3d1a29e605/5881436703a458d2/res/800e9d0a-6599-4ba0-8195-4c3e9bff735a/skitch.png">
