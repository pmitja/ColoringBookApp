"use client";

import { siteConfig } from "@/config/site";
import { SectionColumns } from "@/components/dashboard/section-columns";
import { useDeleteAccountModal } from "@/components/modals/delete-account-modal";
import { Icons } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";

export function DeleteAccountSection() {
  const { setShowDeleteAccountModal, DeleteAccountModal } =
    useDeleteAccountModal();

  const userPaidPlan = true;

  return (
    <>
      <DeleteAccountModal />
      <SectionColumns
        title="Delete Account"
        description="This action is permanent and cannot be undone."
      >
        <div className="border-destructive/30 bg-destructive/5 rounded-2xl border p-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold text-foreground">
                Confirm account deletion
              </span>
              {userPaidPlan ? (
                <span className="border-destructive/40 bg-destructive/10 text-destructive inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]">
                  <Icons.warning className="size-3" />
                  Subscription active
                </span>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              This permanently deletes your {siteConfig.name} account
              {userPaidPlan ? " and subscription" : ""}.
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setShowDeleteAccountModal(true)}
            className="mt-4 h-11 px-5 text-sm"
          >
            <Icons.trash className="mr-2 size-4" />
            Delete Account
          </Button>
        </div>
      </SectionColumns>
    </>
  );
}
