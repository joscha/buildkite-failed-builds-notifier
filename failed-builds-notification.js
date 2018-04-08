'use latest';
import sendgrid from 'sendgrid';
const helper = sendgrid.mail;
/**
* @param context {WebtaskContext}
*/
module.exports = (context, cb) => {
  
  const { SENDGRID_API_KEY, SENDER_EMAIL_ADDRESS, BUILDKITE_TOKEN } = context.secrets;
  
  if (!('x-buildkite-token' in context.headers) || context.headers['x-buildkite-token'] !== BUILDKITE_TOKEN) {
    cb(new Error('Missing or incorrect Buildkite token'));
    return;
  }
  if (!context.body) {
    cb(new Error('Wrong Content-Type?'));
    return;
  }
  
  const { event, status, build } = context.body;
  
  switch(event) {
    case 'ping':
      cb(null, 'pong');
      return;
    case 'build.finished':
      // this is the only one we want to handle
      break;
    default:
      cb(new Error(`Unknown Buildkite event '${event}'`));
      return;
  }
  
  const { state } = build;
  switch(state) {
    case 'passed':
      // resolve any stored culprits
      break;
    case 'failed':
      // store culprits and send Email
      const { creator: { email: to_email }} = build;
      sendMail(SENDGRID_API_KEY, SENDER_EMAIL_ADDRESS, to_email , 'Bilbo says: O noes!')
        .then(response => cb(null, response))
        .catch(cb);
      break;
    default:
      // not interested in this state, but won't fail the hook
      cb();
      return;
  }
};

function sendMail(SENDGRID_API_KEY, from_email, to_email, subject, content) {
    const mail = new helper.Mail(
    new helper.Email(from_email),
    subject,
    new helper.Email(to_email),
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


