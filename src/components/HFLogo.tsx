import hfLogo from "@/assets/Logotipo do Herdeiros do futuro.jpeg";

interface HFLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "w-10 h-10",
  md: "w-14 h-14",
  lg: "w-20 h-20",
};

const HFLogo = ({ size = "md", className = "" }: HFLogoProps) => {
  return (
    <div
      className={`${sizeMap[size]} rounded-[1.15rem] bg-[#fbf4e5] flex items-center justify-center overflow-hidden shadow-[0_8px_22px_hsl(158_35%_14%/0.14)] ring-1 ring-black/5 ${className}`}
    >
      <img
        src={hfLogo}
        alt="Herdeiros do Futuro"
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default HFLogo;
