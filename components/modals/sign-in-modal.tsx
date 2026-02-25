import { signIn } from "next-auth/react";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";

import { Icons } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { siteConfig } from "@/config/site";

function SignInModal({
  showSignInModal,
  setShowSignInModal,
}: {
  showSignInModal: boolean;
  setShowSignInModal: Dispatch<SetStateAction<boolean>>;
}) {
  const [signInClicked, setSignInClicked] = useState(false);

  return (
    <Modal showModal={showSignInModal} setShowModal={setShowSignInModal}>
      <div className="playful-theme w-full overflow-hidden rounded-[2rem] bg-background">
        <div className="border-border/50 bg-muted/30 flex flex-col items-center justify-center space-y-4 border-b px-4 pb-8 pt-10 text-center md:px-10">
          <a href={siteConfig.url} className="flex items-center justify-center">
            <Icons.logo className="h-10 w-auto max-w-[200px] object-contain" />
          </a>
          <h3 className="font-heading text-2xl font-bold text-foreground">Welcome Back</h3>
          <p className="max-w-sm text-sm font-medium text-muted-foreground">
            Sign in to continue. Only your email and profile picture will be stored.
          </p>
        </div>

        <div className="flex flex-col space-y-4 px-4 py-8 md:px-10">
          <Button
            variant="default"
            className="hover:bg-primary/90 h-12 w-full gap-2 rounded-2xl bg-primary text-base font-bold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
            disabled={signInClicked}
            onClick={() => {
              setSignInClicked(true);
              signIn("google", { redirect: false }).then(() =>
                setTimeout(() => {
                  setShowSignInModal(false);
                }, 400),
              );
            }}
          >
            {signInClicked ? (
              <Icons.spinner className="size-5 animate-spin" />
            ) : (
              <Icons.google className="size-5" />
            )}{" "}
            Sign In with Google
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function useSignInModal() {
  const [showSignInModal, setShowSignInModal] = useState(false);

  const SignInModalCallback = useCallback(() => {
    return (
      <SignInModal
        showSignInModal={showSignInModal}
        setShowSignInModal={setShowSignInModal}
      />
    );
  }, [showSignInModal, setShowSignInModal]);

  return useMemo(
    () => ({
      setShowSignInModal,
      SignInModal: SignInModalCallback,
    }),
    [setShowSignInModal, SignInModalCallback],
  );
}
