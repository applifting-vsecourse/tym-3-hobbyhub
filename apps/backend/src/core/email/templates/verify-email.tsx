import { Hr, Text } from 'react-email';
import * as React from 'react';
import {
  callout,
  COLOR,
  finePrint,
  Layout,
  LinkFallback,
  paragraph,
  PrimaryButton,
} from './_components/layout';

export const VERIFY_EMAIL_SUBJECT = 'Ověř svůj e-mail v HobbyHubu';

// F-03.2.
export interface VerifyEmailProps {
  url: string;
}

export const VerifyEmail = ({ url }: VerifyEmailProps): React.JSX.Element => (
  <Layout
    preview="Potvrď e-mail a dokonči registraci v HobbyHubu."
    heading="Ověř svůj e-mail"
  >
    <Text style={paragraph}>
      Ještě jeden krok a můžeš zveřejňovat vlastní akce a zakládat skupiny.
      Klikni na tlačítko a potvrď, že je tento e-mail tvůj.
    </Text>
    <PrimaryButton href={url}>Ověřit e-mail</PrimaryButton>
    <Text style={callout}>Odkaz platí 24 hodin.</Text>
    <Hr style={{ borderColor: COLOR.border, margin: '32px 0 16px' }} />
    <LinkFallback url={url} />
    <Text style={finePrint}>
      Pokud ses do HobbyHubu neregistroval(a), tento e-mail ignoruj.
    </Text>
  </Layout>
);

export default VerifyEmail;
