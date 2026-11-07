import { Hr, Text } from 'react-email';
import * as React from 'react';
import {
  COLOR,
  finePrint,
  Layout,
  LinkFallback,
  paragraph,
  PrimaryButton,
} from './_components/layout';

export const RESET_PASSWORD_SUBJECT = 'Obnova hesla v HobbyHubu';

export interface ResetPasswordProps {
  username: string;
  url: string;
}

export const ResetPassword = ({
  username,
  url,
}: ResetPasswordProps): React.JSX.Element => (
  <Layout preview="Nastav si nové heslo do HobbyHubu." heading="Obnova hesla">
    <Text style={paragraph}>
      Ahoj {username}, dostali jsme žádost o obnovu hesla k tvému účtu v
      HobbyHubu. Klikni na tlačítko a nastav si nové.
    </Text>
    <PrimaryButton href={url}>Nastavit nové heslo</PrimaryButton>
    <Hr style={{ borderColor: COLOR.border, margin: '32px 0 16px' }} />
    <LinkFallback url={url} />
    <Text style={finePrint}>
      Pokud jsi o obnovu hesla nežádal(a), tento e-mail ignoruj. Tvoje heslo
      zůstane stejné.
    </Text>
  </Layout>
);

export default ResetPassword;
