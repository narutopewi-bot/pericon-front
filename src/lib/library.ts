export const Porcion = (x:string, w:number): number => {
    if (!x) return 0;
    let salida: string[] = x.split("-").filter(s => s.length > 0);
    const parsed = parseInt(salida[w], 10);
    return isNaN(parsed) ? 0 : parsed;
};

export const Trozo = (x:string, w:number): string => {
    let salida: string[] = x.split(" ");
    return salida[w];
};

export const Carta = (x: number): string => {
    let salida : string = "";
    let parcial : string = "";
    switch(x) {
        case 0: 
            salida = "1_gold.png";
            break;
        case 1: 
            salida = "2_gold.png";
            break;
        case 2: 
            salida = "3_gold.png";
            break;
        case 3: 
            salida = "4_gold.png";
            break;
        case 4: 
            salida = "5_gold.png";
            break;
        case 5: 
            salida = "6_gold.png";
            break;
        case 6: 
            salida = "7_gold.png";
            break;
        case 7: 
            salida = "10_gold.png";
            break;
        case 8: 
            salida = "11_gold.png";
            break;
        case 9: 
            salida = "12_gold.png";
            break;
        case 10: 
            salida = "1_cups.png";
            break;
        case 11: 
            salida = "2_cups.png";
            break;
         case 12: 
            salida = "3_cups.png";
            break;
        case 13: 
            salida = "4_cups.png";
            break;
        case 14: 
            salida = "5_cups.png";
            break;
        case 15: 
            salida = "6_cups.png";
            break;
        case 16: 
            salida = "7_cups.png";
            break;
        case 17: 
            salida = "10_cups.png";
            break;
        case 18: 
            salida = "11_cups.png";
            break;
        case 19: 
            salida = "12_cups.png";
            break;
        case 20: 
            salida = "1_swords.png";
            break;
        case 21: 
            salida = "2_swords.png";
            break;
        case 22: 
            salida = "3_swords.png";
            break;
        case 23: 
            salida = "4_swords.png";
            break;
        case 24: 
            salida = "5_swords.png";
            break;
        case 25: 
            salida = "6_swords.png";
            break;
        case 26: 
            salida = "7_swords.png";
            break;
        case 27: 
            salida = "10_swords.png";
            break;
        case 28: 
            salida = "11_swords.png";
            break;
        case 29: 
            salida = "12_swords.png";
            break;
        case 30: 
            salida = "1_clubs.png";
            break;
        case 31: 
            salida = "2_clubs.png";
            break;
        case 32: 
            salida = "3_clubs.png";
            break;
        case 33: 
            salida = "4_clubs.png";
            break;
        case 34: 
            salida = "5_clubs.png";
            break;
        case 35: 
            salida = "6_clubs.png";
            break;
        case 36: 
            salida = "7_clubs.png";
            break;
        case 37: 
            salida = "10_clubs.png";
            break;
        case 38: 
            salida = "11_clubs.png";
            break;
        case 39: 
            salida = "12_clubs.png";
            break;  
        default:
            salida = "card_back.png";                  
            break;
    }
    if (x >= 0 && x <= 39) {
        parcial = "/cards/".concat(salida); 
    } else {
        parcial = "/card_back.png";
    }
    return parcial;
};

interface Card {
    id: number    
    position: number
    suit: string
    number: number
    image: string
};

const ClubCard = (x: number) : string => { 
    let nameClub : string = '';
    return nameClub;
};

const NumCard = (x: number) : number => {
    let _numCard : number = 0;
    if (x > 9) x -= 10;
    if (x > 9) x -= 10;
    if (x > 9) x -= 10;
    switch (x)
    {
        case 0:
            _numCard = 1;
            break;
        case 1:
            _numCard = 2;
            break;
        case 2:
            _numCard = 3;
            break;
        case 3:
            _numCard = 4;
            break;
        case 4:
            _numCard = 5;
            break;
        case 5:
            _numCard = 6;
            break;
        case 6:
            _numCard = 7;
            break;
        case 7:
            _numCard = 10;
            break;
        case 8:
            _numCard = 11;
            break;
        case 9:
            _numCard = 12;
            break;
    }    
    return _numCard;
};

export const Baraja = (x : number, y: number) : Card => {
    const clubCard : string = ClubCard(x);
    const numeCard : number = NumCard(x);
    const nameCard : string = Carta(x);
    return { id: x, position: y, suit: clubCard, number: numeCard, image: nameCard};
};

/**
 * Determina si una carta es Triunfo según las reglas del Pericón y la carta de la Vida:
 * - Triunfos universales fijos:
 *   - 4: 5 de Oro (Perico)
 *   - 33: 4 de Basto (Perica)
 *   - 38: 11 de Basto
 *   - 0: 1 de Oro
 *   - 7: 10 de Oro
 * - Cualquier carta del mismo palo de la Vida
 */
export const isTrumpCard = (cardId: number, lifeCardId: number): boolean => {
    if (cardId < 0 || lifeCardId < 0) return false;
    if (cardId === 4 || cardId === 33 || cardId === 38 || cardId === 0 || cardId === 7 || cardId === 2) {
        return true;
    }
    const lifeSuit = Math.floor(lifeCardId / 10);
    const cardSuit = Math.floor(cardId / 10);
    return cardSuit === lifeSuit;
};