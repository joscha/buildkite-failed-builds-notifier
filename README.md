# buildkite-failed-builds-notifier
A webhook that sends out an email to people that potentially have failed a build


## Needed modules
```sh
wt modules add github-url-from-git@1.5.0
wt modules add sendgrid@5.2.3
```

## Needed secrets:
* `SENDGRID_API_TOKEN`: Create a [new API token](https://app.sendgrid.com/settings/api_keys) and give it full access for `Mail Send`: ![Mail send](https://www.evernote.com/l/AAUYmBRDNGlBC49CptIHh23AKDcNNyEuECQ).
* `BUILDKITE_TOKEN`: from your Buildkite [webhook settings](https://buildkite.com/organizations/your-org/services/webhook/new):
![Token](https://www.evernote.com/l/AAWQzapREihP3plG2FKNZnBo9SVHCoqHqmc).
* `SENDER_EMAIL_ADDRESS`: The email address that is used by sendgrid to generate the build fail emails.


## Sendgrid settings:

Disable click tracking:
![Click tracking](https://www.evernote.com/l/AAW5w4SRsHZKGYlXRC1o7Fp_Yx_Y7QjAhf8)
otherwise the URLs in the plain text email become really long.

Enable plain content:
![Plain Content](https://www.evernote.com/l/AAU7yMglswdB2IyY_-gqc1spbRqHlOpRWMU) otherwise the plain text will be automatically converted to HTML by sendgrid and the formatting will be off.

## Buildkite webhook settings:

Enable the `ping` and `build.finished` events:
![Events](https://www.evernote.com/l/AAUbAqm-xvJCq5BVvD0aKeYFWIFDZwOkWNI)
