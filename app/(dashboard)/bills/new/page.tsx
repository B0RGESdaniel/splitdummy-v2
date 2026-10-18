import { createBill } from "@/app/(dashboard)/bills/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewBillPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Nova conta</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createBill} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nome da conta</Label>
              <Input
                id="name"
                name="name"
                placeholder="Ex: Jantar de sábado"
                required
                autoFocus
              />
            </div>
            <Button type="submit">Criar conta</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
