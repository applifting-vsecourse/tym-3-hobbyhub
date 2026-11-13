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

export const ADMIN_RESET_PASSWORD_SUBJECT =
  'Obnova hesla do administrace HobbyHubu';

// ADR-0021: "Zapomenuté heslo" on the administrators' sign-in.
export interface AdminResetPasswordProps {
  url: string;
}

export const AdminResetPassword = ({
  url,
}: AdminResetPasswordProps): React.JSX.Element => (
  <Layout
    preview="Nastav si nové heslo do administrace HobbyHubu."
    heading="Obnova hesla do administrace"
  >
    <Text style={paragraph}>
      Dostali jsme žádost o obnovu hesla k tvému účtu správce HobbyHubu. Klikni
      na tlačítko a nastav si nové.
    </Text>
    <PrimaryButton href={url}>Nastavit nové heslo</PrimaryButton>
    <Text style={callout}>Odkaz platí 1 hodinu a dá se použít jen jednou.</Text>
    <Hr style={{ borderColor: COLOR.border, margin: '32px 0 16px' }} />
    <LinkFallback url={url} />
    <Text style={finePrint}>
      Pokud jsi o obnovu hesla nežádal(a), tento e-mail ignoruj. Tvoje heslo
      zůstane stejné.
    </Text>
  </Layout>
);

export default AdminResetPassword;
