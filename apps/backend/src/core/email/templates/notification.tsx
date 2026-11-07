import { Hr, Link, Text } from 'react-email';
import * as React from 'react';
import {
  COLOR,
  finePrint,
  inlineLink,
  Layout,
  LinkFallback,
  paragraph,
  PrimaryButton,
} from './_components/layout';

// F-09.5, ADR-0018: one template for every notification (ADR-0015). What it
// says is put together by the notification module; this is only the look.
export interface NotificationEmailProps {
  heading: string;
  // A sentence under the heading, if the type has one.
  body?: string;
  buttonLabel: string;
  url: string;
  notificationsUrl: string;
}

export const NotificationEmail = ({
  heading,
  body,
  buttonLabel,
  url,
  notificationsUrl,
}: NotificationEmailProps): React.JSX.Element => (
  <Layout preview={heading} heading={heading}>
    {body ? <Text style={paragraph}>{body}</Text> : null}
    <PrimaryButton href={url}>{buttonLabel}</PrimaryButton>
    <Hr style={{ borderColor: COLOR.border, margin: '32px 0 16px' }} />
    <LinkFallback url={url} />
    <Text style={finePrint}>
      Všechna upozornění najdeš i v aplikaci v{' '}
      <Link href={notificationsUrl} style={inlineLink}>
        přehledu upozornění
      </Link>
      .
    </Text>
  </Layout>
);

export default NotificationEmail;
