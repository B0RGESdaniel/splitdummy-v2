import { SheetCell, SheetInput } from "@/components/auth/sheet-grid";
import type { AvatarKey } from "@/components/bills/avatar-icon";
import { AvatarPicker } from "@/components/bills/avatar-picker";
import { MAX_FIRST_NAME_LENGTH } from "@/lib/auth/first-name";

// Nome e avatar como células da grade: usados no primeiro acesso e no
// convite (quem não está na lista, ou confirma o lugar que reivindicou).
export function ProfileFields({
  defaultName,
  defaultAvatar,
}: {
  defaultName: string;
  defaultAvatar?: AvatarKey;
}) {
  return (
    <>
      <SheetCell label="Como te chamam?" htmlFor="display_name">
        <SheetInput
          id="display_name"
          name="display_name"
          defaultValue={defaultName}
          autoComplete="given-name"
          maxLength={MAX_FIRST_NAME_LENGTH}
          required
          autoFocus={!defaultName}
        />
      </SheetCell>
      <SheetCell label="Avatar">
        <div className="pt-1 pb-0.5">
          <AvatarPicker name="avatar_key" defaultValue={defaultAvatar} />
        </div>
      </SheetCell>
    </>
  );
}
