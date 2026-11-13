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

export const ADMIN_INVITATION_SUBJECT = 'Pozvánka do administrace HobbyHubu';

// ADR-0021: a colleague added you as an administrator. Only the link, as the
// visibility matrix allows for setting a password: not who invited you.
export interface AdminInvitationProps {
  url: string;
}

export const AdminInvitation = ({
  url,
}: AdminInvitationProps): React.JSX.Element => (
  <Layout
    preview="Nastav si heslo a přihlas se do administrace HobbyHubu."
    heading="Pozvánka do administrace"
  >
    <Text style={paragraph}>
      Byl(a) jsi přidán(a) mezi správce HobbyHubu. Klikni na tlačítko, nastav si
      heslo a pak se přihlas do administrace.
    </Text>
    <PrimaryButton href={url}>Nastavit heslo</PrimaryButton>
    <Text style={callout}>Odkaz platí 72 hodin a dá se použít jen jednou.</Text>
    <Hr style={{ borderColor: COLOR.border, margin: '32px 0 16px' }} />
    <LinkFallback url={url} />
    <Text style={finePrint}>
      Pokud nic takového nečekáš, tento e-mail ignoruj. Bez nastaveného hesla se
      do administrace nikdo nepřihlásí.
    </Text>
  </Layout>
);

export default AdminInvitation;
