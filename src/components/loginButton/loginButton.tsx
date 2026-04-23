import Image, { StaticImageData } from "next/image";

interface LoginButtonProps {
  image: StaticImageData;
  alt: string;
  border?: boolean;
}

export default function LoginButton({ image, alt, border = false }: LoginButtonProps) {
  return (
    <div className="w-12 h-12 cursor-pointer">
      <Image
        className={`w-full h-full ${border && "border-[#DDDDDD]"}`}
        src={image}
        alt={alt}
      />
    </div>
  );
}
