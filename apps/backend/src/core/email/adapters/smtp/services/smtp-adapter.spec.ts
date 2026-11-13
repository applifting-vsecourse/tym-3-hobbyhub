import { SMTPAdapter } from './smtp-adapter';

const sendMail = jest.fn();
const createTransport = jest.fn<{ sendMail: jest.Mock }, [unknown]>(() => ({
  sendMail,
}));
jest.mock('nodemailer', () => ({
  createTransport: (options: unknown): { sendMail: jest.Mock } =>
    createTransport(options),
}));

const config = {
  host: 'smtp.example.com',
  port: 465,
  secure: true,
  user: 'jana@example.com',
  pass: 'secret',
};

describe('SMTPAdapter', () => {
  beforeEach(() => {
    sendMail.mockReset();
    createTransport.mockClear();
  });

  // On port 587 the connection starts unencrypted; without this, a stripped
  // STARTTLS offer would send the password and the e-mail in plain text.
  it('refuses to send over an unencrypted connection', () => {
    new SMTPAdapter({ ...config, port: 587, secure: false });

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ secure: false, requireTLS: true }),
    );
  });

  it('sends from the user name when no sender is set', async () => {
    await new SMTPAdapter(config).sendEmail('a@example.com', 'Hi', '<p>x</p>');

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'jana@example.com' }),
    );
  });

  // Mailjet's user name is an API key, not an address.
  it('sends from the configured sender when there is one', async () => {
    await new SMTPAdapter({
      ...config,
      user: 'api-key',
      from: 'HobbyHub <noreply@example.com>',
    }).sendEmail('a@example.com', 'Hi', '<p>x</p>');

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'HobbyHub <noreply@example.com>' }),
    );
  });

  it('treats an empty sender as unset', async () => {
    await new SMTPAdapter({ ...config, from: '' }).sendEmail(
      'a@example.com',
      'Hi',
      '<p>x</p>',
    );

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'jana@example.com' }),
    );
  });
});
