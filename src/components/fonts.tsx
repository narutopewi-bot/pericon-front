import { Angkor, Bowlby_One_SC, Almarai, Archivo } from "next/font/google";

const bowlbyOneSC = Bowlby_One_SC({ weight: "400", subsets: ["latin"] });
const almarai = Almarai({ weight: ["300", "400", "700"], subsets: ["arabic"] });
const archivo = Archivo({ weight: ["300", "400", "700"], subsets: ["latin"] });
const angkor = Angkor({ weight: "400", subsets: ["latin"] });

export { bowlbyOneSC, angkor, almarai, archivo };
