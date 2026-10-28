import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Landmark, Copy, Smartphone } from "lucide-react";
import { toast } from "sonner";

interface BankDetails {
  id: string;
  banco: string;
  iban: string;
  titular: string;
  express: string | null;
  instrucoes: string | null;
}

const BankDetailsCard = () => {
  const [data, setData] = useState<BankDetails | null>(null);

  useEffect(() => {
    supabase.from("bank_details").select("*").limit(1).maybeSingle().then(({ data }) => {
      if (data) setData(data as BankDetails);
    });
  }, []);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Landmark className="h-5 w-5 text-primary" />
          Dados Bancários do Colégio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Row label="Banco" value={data.banco} />
        <Row label="Titular" value={data.titular} />
        <Row label="IBAN" value={data.iban} onCopy={() => copy(data.iban, "IBAN")} />
        {data.express && (
          <Row
            label="Express"
            value={data.express}
            icon={<Smartphone className="h-3.5 w-3.5" />}
            onCopy={() => copy(data.express!, "Express")}
          />
        )}
        {data.instrucoes && (
          <p className="text-xs text-muted-foreground border-t border-border pt-3 mt-3">{data.instrucoes}</p>
        )}
      </CardContent>
    </Card>
  );
};

const Row = ({
  label,
  value,
  onCopy,
  icon,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  icon?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-3">
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-mono font-semibold text-foreground">{value}</span>
    </div>
    {onCopy && (
      <Button size="icon" variant="ghost" onClick={onCopy} className="h-7 w-7">
        <Copy className="h-3.5 w-3.5" />
      </Button>
    )}
  </div>
);

export default BankDetailsCard;
