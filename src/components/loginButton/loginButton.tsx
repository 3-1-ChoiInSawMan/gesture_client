import Image, { StaticImageData } from "next/image";

interface LoginButtonProps {
  image: StaticImageData;
  alt: string;
  border?: boolean;
  href?: string;
}

export default function LoginButton({ image, alt, border = false, href }: LoginButtonProps) {
  const inner = (
    <Image
      className={`w-full h-full ${border && "border-[#DDDDDD]"}`}
      src={image}
      alt={alt}
    />
  );

  if (href) {
    return (
      <a href={href} className="w-12 h-12 cursor-pointer block">
        {inner}
      </a>
    );
  }

  return (
    <div className="w-12 h-12 cursor-pointer">
      {inner}
    </div>
  );
}
