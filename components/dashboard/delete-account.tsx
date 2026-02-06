"use client";

import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import { SectionColumns } from "@/components/dashboard/section-columns";
import { useDeleteAccountModal } from "@/components/modals/delete-account-modal";
import { Icons } from "@/components/shared/icons";

export function DeleteAccountSection() {
  const { setShowDeleteAccountModal, DeleteAccountModal } =
    useDeleteAccountModal();

  const userPaidPlan = true;

  return (
    <>
      <DeleteAccountModal />
      <SectionColumns
        title="Delete Account"
        description="This is a danger zone - Be careful !"
      >
        <div className="flex flex-col gap-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold">Are you sure?</span>

              {userPaidPlan ? (
                <div className="flex items-center gap-1 rounded-full border border-rose-400/40 bg-rose-500/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-100">
                  <div className="rounded-full bg-rose-500 p-1">
                    <Icons.close size={10} className="text-rose-50" />
                  </div>
                  Active Subscription
                </div>
              ) : null}
            </div>
            <div className="text-balance text-sm text-muted-foreground">
              Permanently delete your {siteConfig.name} account
              {userPaidPlan ? " and your subscription" : ""}. This action cannot
              be undone - please proceed with caution.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              variant="destructive"
              onClick={() => setShowDeleteAccountModal(true)}
              className="h-11 px-5 text-sm"
            >
              <Icons.trash className="mr-2 size-4" />
              <span>Delete Account</span>
            </Button>
          </div>
        </div>
      </SectionColumns>
    </>
  );
}
