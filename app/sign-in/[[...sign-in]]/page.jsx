import { SignIn } from '@clerk/nextjs';

export const metadata = {
  title: 'Sign in · DAS Content Engine',
};

export default function SignInPage() {
  return (
    <main className="sign-in-shell">
      <section className="sign-in-brand">
        <span className="sign-in-blockworks">Blockworks</span>
        <div>
          <span className="sign-in-mark">DAS</span>
          <span className="sign-in-product">Content Engine</span>
        </div>
        <p>Internal workspace</p>
      </section>
      <section className="sign-in-panel">
        <SignIn
          fallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
          appearance={{
            variables: {
              colorPrimary: '#0d0d0d',
              colorText: '#0d0d0d',
              colorBackground: '#ffffff',
              borderRadius: '0px',
            },
            elements: {
              cardBox: 'clerk-card-box',
              card: 'clerk-card',
              headerTitle: 'clerk-title',
              formButtonPrimary: 'clerk-button',
            },
          }}
        />
      </section>
    </main>
  );
}
