import githubUrlFromGit from 'github-url-from-git';
import sendgrid from 'sendgrid';
const helper = sendgrid.mail;

export default function sendEmail(context, culprits, currentCulprit, buildUrl, pipelineName) {
    const { slug, name, email, number } = currentCulprit;
    const subject = `Elves and dragons! ${pipelineName} (${slug}) failed (#${number})`;

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
