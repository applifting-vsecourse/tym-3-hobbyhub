import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { AdminTable } from "@/components/hobbyhub/AdminTable"
import { ResponsiveSheet } from "@/components/hobbyhub/ResponsiveSheet"
import { Button } from "@/components/ui/button"

import { adminUserBlocksQueryOptions } from "@/features/admin/api/adminQueryOptions"
import type { AdminUserBlock } from "@/features/admin/api/adminSchemas"
import { useBlockUser, useUnblockUser } from "@/features/admin/api/userBlockMutations"
import { AdminSection } from "@/features/admin/components/AdminFacts"
import { AdminLink } from "@/features/admin/components/AdminLink"
import { AdminState } from "@/features/admin/components/AdminState"
import { BlockUserSheet } from "@/features/admin/components/BlockUserSheet"
import { useAdminFormat } from "@/features/admin/lib/format"

type AdminUserBlocksProps = {
  user: { id: string; name: string }
}

/**
 * #239, ADR-0022: who the person is blocked from. Only the administration
 * sees it (visibility matrix); neither person of a pair learns of the block.
 */
export function AdminUserBlocks({ user }: AdminUserBlocksProps) {
  const { t } = useTranslation()
  const format = useAdminFormat()
  const query = useQuery(adminUserBlocksQueryOptions(user.id))
  const block = useBlockUser(user.id)
  const unblock = useUnblockUser(user.id)
  const [isBlockOpen, setIsBlockOpen] = useState(false)
  const [ending, setEnding] = useState<AdminUserBlock | null>(null)

  return (
    <AdminSection title={t("admin.blocks.title")}>
      {query.data ? (
        query.data.length === 0 ? (
          <p className="typo-body text-muted-foreground">{t("admin.blocks.empty")}</p>
        ) : (
          <AdminTable<AdminUserBlock>
            label={t("admin.blocks.title")}
            rows={query.data}
            rowKey={(row) => row.otherUser.id}
            primary={{
              key: "otherUser",
              header: t("admin.blocks.otherUser"),
              cell: (row) => (
                <AdminLink to={{ kind: "user", id: row.otherUser.id }}>
                  {row.otherUser.name}
                </AdminLink>
              ),
            }}
            columns={[
              {
                key: "reason",
                header: t("admin.blocks.reason"),
                cell: (row) => (
                  <span className="break-words whitespace-pre-line">{row.reason}</span>
                ),
              },
              {
                key: "createdAt",
                header: t("admin.blocks.createdAt"),
                cell: (row) => format.dateTime(row.createdAt),
              },
              {
                key: "createdBy",
                header: t("admin.blocks.createdBy"),
                cell: (row) => row.createdBy?.name ?? t("admin.none"),
              },
              {
                key: "actions",
                header: t("admin.blocks.actions"),
                cell: (row) => (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      unblock.reset()
                      setEnding(row)
                    }}
                  >
                    {t("admin.blocks.unblock")}
                  </Button>
                ),
              },
            ]}
          />
        )
      ) : (
        <AdminState query={query} />
      )}
      <div>
        <Button
          variant="outline"
          onClick={() => {
            block.reset()
            setIsBlockOpen(true)
          }}
        >
          {t("admin.blocks.block")}
        </Button>
      </div>
      <BlockUserSheet
        isOpen={isBlockOpen}
        onOpenChange={setIsBlockOpen}
        user={user}
        isPending={block.isPending}
        error={block.error}
        onSubmit={async (values) => {
          await block.mutateAsync(values)
          setIsBlockOpen(false)
          toast.success(t("admin.blocks.blocked"))
        }}
      />
      <ResponsiveSheet
        isOpen={ending !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEnding(null)
        }}
        title={t("admin.blocks.unblockTitle", {
          name: user.name,
          other: ending?.otherUser.name ?? "",
        })}
        hasCloseButton
        footer={
          ending ? (
            <>
              <Button
                disabled={unblock.isPending}
                onClick={() =>
                  unblock.mutate(ending.otherUser.id, {
                    onSuccess: () => {
                      setEnding(null)
                      toast.success(t("admin.blocks.unblocked"))
                    },
                  })
                }
              >
                {unblock.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                {t("admin.blocks.unblockSubmit")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setEnding(null)}
              >
                {t("admin.blocks.cancel")}
              </Button>
            </>
          ) : null
        }
      >
        <div className="flex flex-col gap-4 pb-1">
          <p className="typo-body text-foreground">{t("admin.blocks.unblockText")}</p>
          {unblock.error ? (
            <p
              role="alert"
              className="typo-small text-destructive"
            >
              {t("admin.blocks.unblockFailed")}
            </p>
          ) : null}
        </div>
      </ResponsiveSheet>
    </AdminSection>
  )
}
