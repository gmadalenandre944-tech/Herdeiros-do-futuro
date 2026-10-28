import HFLogo from "@/components/HFLogo";
import { Link } from "@/lib/router-compat";
import { Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo & About */}
          <div className="flex flex-col items-start gap-4">
            <div className="flex items-center gap-3">
              <HFLogo size="sm" className="bg-primary-foreground text-primary" />
              <div>
                <h3 className="font-display font-semibold text-xl">Herdeiros do Futuro</h3>
                <p className="text-primary-foreground/65 text-xs uppercase tracking-[0.15em]">Sistema de Gestão Escolar</p>
              </div>
            </div>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              Formando os líderes de amanhã com excelência e dedicação.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-montserrat font-semibold mb-4">Links Rápidos</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              
              <li><Link to="/matricula" className="hover:text-primary-foreground transition-colors">Matrícula</Link></li>
              <li><Link to="/pauta" className="hover:text-primary-foreground transition-colors">Mini Pauta</Link></li>
            </ul>
          </div>

          {/* Contact & Map */}
          <div>
            <h4 className="font-montserrat font-semibold mb-4">Contactos</h4>
            <div className="space-y-2 text-sm text-primary-foreground/70">
              <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> +244 923 456 789</p>
              <p className="flex items-center gap-2"><Mail className="h-4 w-4" /> info@herdeirosdofuturo.co.ao</p>
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Luanda, Angola</p>
            </div>
            <div className="mt-4 rounded-lg overflow-hidden border border-primary-foreground/20">
              <iframe
                title="Localização"
                width="100%"
                height="150"
                style={{ border: 0 }}
                loading="lazy"
                src="https://www.openstreetmap.org/export/embed.html?bbox=13.2,-8.9,13.3,-8.8&layer=mapnik"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-6 text-center text-sm text-primary-foreground/60">
          © {new Date().getFullYear()} Herdeiros do Futuro. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
