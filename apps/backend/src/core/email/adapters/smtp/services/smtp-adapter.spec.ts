import { SMTPAdapter } from './smtp-adapter';

const sendMail = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: (): { sendMail: jest.Mock } => ({ sendMail }),
}));

const config = {
  host: 'smtp.example.com',
  port: 465,
  secure: true,
  user: 'jana@example.com',
  pass: 'secret',
};

describe('SMTPAdapter', () => {
  beforeEach(() => sendMail.mockReset());

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
});
