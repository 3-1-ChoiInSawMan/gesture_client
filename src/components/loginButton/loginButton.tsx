import Image, { StaticImageData } from 'next/image';

interface loginButtonProps{
  image: StaticImageData;
  alt: string; 
  border?: boolean;
}

export default function loginButton({image, alt, border=false}: loginButtonProps){
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