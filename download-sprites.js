/**
 * Digimon Sprite Downloader
 * Downloads all animated GIF sprites from Photobucket and organizes by evolution stage
 * Stages: Baby, Child (Rookie), Adult (Champion), Perfect (Ultimate), Ultimate (Mega)
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Create folder structure
const BASE_DIR = path.join(__dirname, 'public', 'digimon');
const STAGES = ['Baby', 'Child', 'Adult', 'Perfect', 'Ultimate', 'Additions'];

function ensureDirs() {
  if (!fs.existsSync(BASE_DIR)) fs.mkdirSync(BASE_DIR, { recursive: true });
  // Remove old folder "1" if it exists
  const oldFolder = path.join(BASE_DIR, '1');
  if (fs.existsSync(oldFolder)) {
    fs.rmSync(oldFolder, { recursive: true, force: true });
    console.log('Removed old digimon/1 folder');
  }
  for (const stage of STAGES) {
    const dir = path.join(BASE_DIR, stage);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
  console.log('Created folders:', STAGES.join(', '));
}

// All sprite URLs organized by stage
const SPRITES = {
  Baby: [
    ['001Chicchimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Baby/001Chicchimon.gif'],
    ['002Koromon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Baby/002Koromon.gif'],
    ['003Tsunomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Baby/003Tsunomon.gif'],
    ['004Poyomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Baby/004Poyomon.gif'],
    ['005Tokomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Baby/005Tokomon.gif'],
    ['006Tanemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Baby/006Tanemon.gif'],
    ['007Pagumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Baby/007Pagumon.gif'],
    ['008Kapurimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Baby/008Kapurimon.gif'],
    ['009Kuramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Baby/009Kuramon.gif'],
    ['010Puttimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Baby/010Puttimon.gif'],
    ['011Chibomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Baby/011Chibomon.gif'],
    ['012Dorimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Baby/012Dorimon.gif'],
    ['013Calumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Baby/013Calumon.gif'],
    ['014Gigimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Baby/014Gigimon.gif'],
    ['015Gumymon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Baby/015Gumymon.gif'],
    ['016Chocomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Baby/016Chocomon.gif'],
    ['017Tsumemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Baby/017Tsumemon.gif'],
    ['018Minomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Baby/018Minomon.gif'],
    ['019Wanyamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Baby/019Wanyamon.gif'],
    ['020Budmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Baby/020Budmon.gif'],
    ['021Botamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Baby/021Botamon.gif'],
    ['022Sunmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Baby/022Sunmon.gif'],
    ['023Moonmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Baby/023Moonmon.gif'],
  ],
  Child: [
    ['024Monodramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/024Monodramon.gif'],
    ['025Agumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/025AgumonSavers.gif'],
    ['026V-mon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/026V-mon.gif'],
    ['027Guilmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/027Guilmon.gif'],
    ['028Dorumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/028Dorumon.gif'],
    ['029Betamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/029Betamon.gif'],
    ['030Gabumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/030Gabumon.gif'],
    ['031Patamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/031Patamon.gif'],
    ['032Biyomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/032Biyomon.gif'],
    ['033Palmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/033Palmon.gif'],
    ['034Tentomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/034Tentomon.gif'],
    ['035Gotsumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/035Gotsumon.gif'],
    ['036Otamamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/036Otamamon.gif'],
    ['037Gomamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/037Gomamon.gif'],
    ['038Bakumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/038Bakumon.gif'],
    ['039PicoDevimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/039PicoDevimon.gif'],
    ['040ToyAgumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/040ToyAgumon.gif'],
    ['041Hagurumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/041Hagurumon.gif'],
    ['042Plotmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/042Plotmon.gif'],
    ['043Wormmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/043Wormmon.gif'],
    ['044Hawkmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/044Hawkmon.gif'],
    ['045Armademon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/045Armademon.gif'],
    ['046Terriermon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/046Terriermon.gif'],
    ['047Lopmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/047Lopmon.gif'],
    ['048Renamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/048Renamon.gif'],
    ['049Impmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/049Impmon.gif'],
    ['050Keramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/050Keramon.gif'],
    ['051Falcomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/051Falcomon.gif'],
    ['052Penmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/052Penmon.gif'],
    ['053Goblimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/053Goblimon.gif'],
    ['054Bearmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/054Bearmon.gif'],
    ['055Kotemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/055Kotemon.gif'],
    ['056Shamamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/056Shamamon.gif'],
    ['057SnowGoblimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/057SnowGoblimon.gif'],
    ['058Shakomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/058Shakomon.gif'],
    ['059YukiAgumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/059YukiAgumon.gif'],
    ['060BlackAgumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/060BlackAgumon.gif'],
    ['061Muchomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/061Muchomon.gif'],
    ['062Ganimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/062Ganimon.gif'],
    ['063Floramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/063Floramon.gif'],
    ['064Gizamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/064Gizamon.gif'],
    ['065Raramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/065Raramon.gif'],
    ['066Alraumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/066Alraumon.gif'],
    ['067ToyAgumonBlack', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/067ToyAgumonBlack.gif'],
    ['068Tsukaimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/068Tsukaimon.gif'],
    ['069PawnChessmonBlack', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/069PawnChessmonBlack.gif'],
    ['070Gaomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/070Gaomon.gif'],
    ['071DotFalcomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/071DotFalcomon.gif'],
    ['072Kudamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/072Kudamon.gif'],
    ['073Kamemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/073Kamemon.gif'],
    ['074Dracmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/074Dracmon.gif'],
    ['075PawnChessmonWhite', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/075PawnChessmonWhite.gif'],
    ['076DotAgumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/076DotAgumon.gif'],
    ['077Kunemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/077Kunemon.gif'],
    ['078Mushmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/078Mushmon.gif'],
    ['079Solarmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/079Solarmon.gif'],
    ['080Candmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/080Candmon.gif'],
    ['081Kokuwamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/081Kokuwamon.gif'],
    ['082Dokunemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/082Dokunemon.gif'],
    ['083Coronamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/083Coronamon.gif'],
    ['084Lunamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Child/084Lunamon.gif'],
  ],
  Adult: [
    ['085Mechanorimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/085Mechanorimon.gif'],
    ['086Greymon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/086Greymon.gif'],
    ['087Tyranomon', 'http://i874.photobucket.com/albums/ab308/WtWSprites/tyranomon.gif'],
    ['088Devimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/088Devimon.gif'],
    ['089Airdramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/089Airdramon.gif'],
    ['090Seadramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/090Seadramon.gif'],
    ['091Numemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/091Numemon.gif'],
    ['092Kabuterimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/092Kabuterimon.gif'],
    ['093Garurumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/093Garurumon.gif'],
    ['094Angemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/094Angemon.gif'],
    ['095Veggiemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/095Veggiemon.gif'],
    ['096Ogremon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/096Ogremon.gif'],
    ['097Bakemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/097Bakemon.gif'],
    ['098Sukamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/098Sukamon.gif'],
    ['099Kokatorimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/099Kokatorimon.gif'],
    ['100Leomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/100Leomon.gif'],
    ['101Kuwagamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/101Kuwagamon.gif'],
    ['102Raremon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/102Raremon.gif'],
    ['103Gekomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/103Gekomon.gif'],
    ['104Tailmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/104Tailmon.gif'],
    ['105Wizarmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/105Wizarmon.gif'],
    ['106Togemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/106Togemon.gif'],
    ['107Guardromon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/107Guadromon.gif'],
    ['108XV-mon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/108XV-mon.gif'],
    ['109Stingmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/109Stingmon.gif'],
    ['110Birdramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/110Birdramon.gif'],
    ['111Ankylomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/111Ankylomon.gif'],
    ['112Galgomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/112Galgomon.gif'],
    ['113Growlmon', 'http://i874.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/113Growlmon.gif'],
    ['114Kyubimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/114Kyubimon.gif'],
    ['115Chrysalimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/115Chrysalimon.gif'],
    ['116Seasarmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/116Seasarmon.gif'],
    ['117Evilmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/117Evilmon.gif'],
    ['118Aquilamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/118Aquilamon.gif'],
    ['119Roachmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/119Roachmon.gif'],
    ['120Dinohumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/120Dinohumon.gif'],
    ['121Hookmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/121Hookmon.gif'],
    ['122Grizzmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/122Grizzmon.gif'],
    ['123Dorugamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/123Dorugamon.gif'],
    ['124Raptordramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/124Raptordramon.gif'],
    ['125Apemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/125Apemon.gif'],
    ['126Starmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/126Starmon.gif'],
    ['127BomberNanimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/127BomberNanimon.gif'],
    ['128Kiwimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/128Kiwimon.gif'],
    ['129Unimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/129Unimon.gif'],
    ['130Sorcerymon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/130Sorcerymon.gif'],
    ['131DarkTyrannomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/131DarkTyrannomon.gif'],
    ['132Akatorimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/132Akatorimon.gif'],
    ['133PlatinumSukamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/133PlatinumSukamon.gif'],
    ['134Ikkakumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/134Ikkakumon.gif'],
    ['135Minotarumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/135Minotarumon.gif'],
    ['136Icemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/136Icemon.gif'],
    ['137DarkLizardmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/137DarkLizardmon.gif'],
    ['138FlareLizardmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/138FlareLizardmon.gif'],
    ['139GeoGreymon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/139GeoGreymon.gif'],
    ['140Gaogamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/140Gaogamon.gif'],
    ['141Diatrymon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/141Diatrymon.gif'],
    ['142Leppamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/142Leppamon.gif'],
    ['143Sunflowmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/143Sunflowmon.gif'],
    ['144Gwappamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/144Gwappamon.gif'],
    ['145Sangloupmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/145Sangloupmon.gif'],
    ['146Peckmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/146Peckmon.gif'],
    ['147Drimogemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/147Drimogemon.gif'],
    ['148NiseDrimogemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/148NiseDrimogemon.gif'],
    ['149MoriShellmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/149MoriShellmon.gif'],
    ['150Wendimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/150Wendimon.gif'],
    ['151Fugamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/151Fugamon.gif'],
    ['152MudFrigimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/152MudFrigimon.gif'],
    ['153Tortomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/153Tortomon.gif'],
    ['154Ebidramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/154Ebidramon.gif'],
    ['155Octomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/155Octomon.gif'],
    ['156Gesomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/156Gesomon.gif'],
    ['157Coelamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/157Coelamon.gif'],
    ['158Shellmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/158Shellmon.gif'],
    ['159Frigimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/159Frigimon.gif'],
    ['160Geremon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/160Geremon.gif'],
    ['161Hyogamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/161Hyogamon.gif'],
    ['162KaratsukiNumemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/162KaratsukiNumemon.gif'],
    ['163IceDevimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/163IceDevimon.gif'],
    ['164Dolphmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/164Dolphmon.gif'],
    ['165Saberdramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/165Saberdramon.gif'],
    ['166Woodmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/166Woodmon.gif'],
    ['167Snimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/167Snimon.gif'],
    ['168Flymon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/168Flymon.gif'],
    ['169Yanmamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/169Yanmamon.gif'],
    ['170SandYanmamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/170SandYanmamon.gif'],
    ['171RedVeggiemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/171RedVeggiemon.gif'],
    ['172Weedmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/172Weedmon.gif'],
    ['173Igamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/173Igamon.gif'],
    ['174Kougamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/174Kougamon.gif'],
    ['175Omekamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/175Omekamon.gif'],
    ['176Clockmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/176Clockmon.gif'],
    ['177Thundermon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/177Thundermon.gif'],
    ['178Tankmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/178Tankmon.gif'],
    ['179Nanimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/179Nanimon.gif'],
    ['180Golemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/180Golemon.gif'],
    ['181Monochromon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/181Monochromon.gif'],
    ['182Mojyamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/182Mojyamon.gif'],
    ['183J-Mojyamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/183J-Mojyamon.gif'],
    ['184Deputymon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/184Deputymon.gif'],
    ['185Centarumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/185Centarumon.gif'],
    ['186Devidramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/186Devidramon.gif'],
    ['187Dokugumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/187Dokugumon.gif'],
    ['188V-Dramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/188V-Dramon.gif'],
    ['189Musyamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/189Musyamon.gif'],
    ['190KnightChessmonWhite', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/190KnightChessmonWhite.gif'],
    ['191KnightChessmonBlack', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/191KnightChessmonBlack.gif'],
    ['192Firamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/192Firamon.gif'],
    ['193Lekismon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Adult/193Lekismon.gif'],
  ],
  Perfect: [
    ['194Volcamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/194Volcamon.gif'],
    ['195MetalGreymon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/195MetalGreymon.gif'],
    ['196Monzaemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/196Monzaemon.gif'],
    ['197SkullGreymon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/197SkullGreymon.gif'],
    ['198MetalMamemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/198MetalMamemon.gif'],
    ['199Andromon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/199Andromon.gif'],
    ['200Etemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/200Etemon.gif'],
    ['201Megadramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/201Megadramon.gif'],
    ['202Piximon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/202Piximon.gif'],
    ['203Digitamamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/203Digitamamon.gif'],
    ['204Mammothmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/204Mammothmon.gif'],
    ['205MegaKabuterimonBlue', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/205MegaKabuterimonBlue.gif'],
    ['206Okuwamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/206Okuwamon.gif'],
    ['207ShogunGekomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/207ShogunGekomon.gif'],
    ['208Angewomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/208Angewomon.gif'],
    ['209Tylomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/209Tylomon.gif'],
    ['210Scorpiomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/210Scorpiomon.gif'],
    ['211MegaSeadramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/211MegaSeadramon.gif'],
    ['212Dragomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/212Dragomon.gif'],
    ['213WereGarurumonBlack', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/213WereGarurumonBlack.gif'],
    ['214WereGarurumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/214WereGarurumon.gif'],
    ['215Vamdemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/215Vamdemon.gif'],
    ['216LadyDevimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/216LadyDevimon.gif'],
    ['217Garudamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/217Garudamon.gif'],
    ['218Blossomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/218Blossomon.gif'],
    ['219Lilymon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/219Lilymon.gif'],
    ['220AlturKabuterimonRed', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/220AlturKabuterimonRed.gif'],
    ['221Nanomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/221Nanomon.gif'],
    ['222Cyberdramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/222Cyberdramon.gif'],
    ['223HolyAngemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/223HolyAngemon.gif'],
    ['224Paildramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/224Paildramon.gif'],
    ['225DinoBeemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/225DinoBeemon.gif'],
    ['226Antiramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/226Antiramon.gif'],
    ['227Arachnemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/227Arachnemon.gif'],
    ['228Mummymon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/228Mummymon.gif'],
    ['229WarGrowlmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/229WarGrowlmon.gif'],
    ['230Rapidmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/230Rapidmon.gif'],
    ['231Taomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/231Taomon.gif'],
    ['232Parrotmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/232Parrotmon.gif'],
    ['233Infermon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/233Infermon.gif'],
    ['234BlackRapidmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/234BlackRapidmon.gif'],
    ['235Pandamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/235Pandamon.gif'],
    ['236MarineDevimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/236Marinedevimon.gif'],
    ['237Karatenmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/237Karatenmon.gif'],
    ['238Kyukimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/238Kyukimon.gif'],
    ['239Sinduramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/239Sinduramon.gif'],
    ['240Pipismon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/240Pipismon.gif'],
    ['241Dorugreymon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/241Dorugreymon.gif'],
    ['242Divermon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/242Divermon.gif'],
    ['243Kimeramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/243Kimeramon.gif'],
    ['244Triceramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/244Triceramon.gif'],
    ['245Deramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/245Deramon.gif'],
    ['246Silphymon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/246Silphymon.gif'],
    ['247SuperStarmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/247SuperStarmon.gif'],
    ['248BlackWarGrowlmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/248BlackWarGrowlmon.gif'],
    ['249Zudomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/249Zudomon.gif'],
    ['250Whamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/250Whamon.gif'],
    ['251Mamemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/251Mamemon.gif'],
    ['252Toucanmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/252Toucanmon.gif'],
    ['253Owlmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/253Owlmon.gif'],
    ['254Meteormon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/254Meteormon.gif'],
    ['255Gigadramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/255Gigadramon.gif'],
    ['256RizeGreymon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/256RizeGreymon.gif'],
    ['257MachGaogamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/257MachGaogamon.gif'],
    ['258Qilinmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/258Qilinmon.gif'],
    ['259Lilamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/259Lilamon.gif'],
    ['260Shadramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/260Shadramon.gif'],
    ['261Matadormon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/261Matadormon.gif'],
    ['262Kabukimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/262Kabukimon.gif'],
    ['263Cherrymon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Additions310311/Cherrymon.gif'],
    ['264Garbagemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/264Garbagemon.gif'],
    ['265LucemonFDM', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/265LucemonFDM.gif'],
    ['266MameTyramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/266MameTyramon.gif'],
    ['267Giromon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/267Giromon.gif'],
    ['268Vademon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/268Vademon.gif'],
    ['269MetalTyrannomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/269MetalTyrannomon.gif'],
    ['270Tekkamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/270Tekkamon.gif'],
    ['271BigMamemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/271BigMamemon.gif'],
    ['272XTyrannomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/272XTyrannomon.gif'],
    ['273Vermilimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/273Vermilimon.gif'],
    ['274Phantomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/274Phantomon.gif'],
    ['275Vajramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/275Vajramon.gif'],
    ['276AeroVeedramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/276AeroVeedramon.gif'],
    ['277GrappLeomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/277GrappLeomon.gif'],
    ['278Knightmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/278Knightmon.gif'],
    ['279Brachiomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/279Brachiomon.gif'],
    ['280Allomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/280Allomon.gif'],
    ['281Lynxmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/281Lynxmon.gif'],
    ['282Shaujingmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/282Shaujingmon.gif'],
    ['283Yatagaramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/283Yatagaramon.gif'],
    ['284BishopChessmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/284BishopChessmon.gif'],
    ['285RookChessmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/285RookChessmon.gif'],
    ['286Flaremon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/286Flaremon.gif'],
    ['287Crescemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/287Crescemon.gif'],
    ['288Flamedramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/288Flamedramon.gif'],
    ['289Magnamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/289Magnamon.gif'],
    ['290Prariemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/290Prariemon.gif'],
    ['291Kongoumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/291Kongoumon.gif'],
    ['292Seahomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/292Seahomon.gif'],
    ['293Shurimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/293Shurimon.gif'],
    ['294Kenkimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/294Kenkimon.gif'],
    ['295Ponchomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/295Ponchomon.gif'],
    ['296ArgomonPerfect', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/296ArgomonPerfect.gif'],
    ['297Shakkoumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Perfect/297Shakkoumon.gif'],
  ],
  Ultimate: [
    ['298Lampmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/298Lampmon.gif'],
    ['299HerculesKabuterimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/299HerculesKabuterimon.gif'],
    ['300SaberLeomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/300SaberLeomon.gif'],
    ['301MetalEtemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/301MetalEtemon.gif'],
    ['302MarineAngemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/302MarineAngemon.gif'],
    ['303GigaSeadramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/303GigaSeadramon.gif'],
    ['304Piedmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/304Piedmon.gif'],
    ['305Creepymon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/305Creepymon.gif'],
    ['306Phoenixmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/306Phoenixmon.gif'],
    ['307Puppetmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/307Puppetmon.gif'],
    ['308Rosemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/308Rosemon.gif'],
    ['309WarGreymon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/309WarGreymon.gif'],
    ['310MetalGarurumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/310MetalGarurumon.gif'],
    ['311Machinedramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/311Machinedramon.gif'],
    ['312VenomMyotismon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/312VenomMyotismon.gif'],
    ['313Omegamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/313Omegamon.gif'],
    ['314Imperialdramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/314Imperialdramon.gif'],
    ['315ImperialdramonFighter', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/315ImperialdramonFighter.gif'],
    ['316ImperialdramonPaladin', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/316ImperialdramonPaladin.gif'],
    ['317Deathmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/317Deathmon.gif'],
    ['318Seraphimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/318Seraphimon.gif'],
    ['319HiAndromon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/319HiAndromon.gif'],
    ['320Devitamamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/320Devitamon.gif'],
    ['321Cherubimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/321Cherubimon.gif'],
    ['323CherubimonVirus', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/323CherubimonVirus.gif'],
    ['324Dukemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/324Dukemon.gif'],
    ['324DukemonCM', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/324DukemonCM.gif'],
    ['326SaintGalgomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/326SaintGalgomon.gif'],
    ['327Sakuyamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/327Sakuyamon.gif'],
    ['328Diaboromon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/328Diaboromon.gif'],
    ['328Neptunmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/328Neptunmon.gif'],
    ['329Pukumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/329Pukumon.gif'],
    ['330Gryphonmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/330Gryphonmon.gif'],
    ['331Plesiomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/331Plesiomon.gif'],
    ['332Armageddemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/332Armageddemon.gif'],
    ['333BelialVamdemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/333BelialVamdemon.gif'],
    ['334ImperialdramonDMBlack', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/334ImperialdramonDMBlack.gif'],
    ['335Boltmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/335Boltmon.gif'],
    ['336PrinceMamemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/336PrinceMamemon.gif'],
    ['337Ophanimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/337Ophanimon.gif'],
    ['338Zanbamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/338Zanbamon.gif'],
    ['339BlackSaintGalgomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/339BlackSaintGalgomon.gif'],
    ['340Jijimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/340Jijimon.gif'],
    ['341Babamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/341Babamon.gif'],
    ['342Anubismon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/342Anubismon.gif'],
    ['343Parasimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/343Parasimon.gif'],
    ['344Cannondramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/344Cannondramon.gif'],
    ['345SlashAngemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/345SlashAngemon.gif'],
    ['346Eaglemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/346Eaglemon.gif'],
    ['347Dorugoramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/347Dorugoramon.gif'],
    ['348Beelzebumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/348Beelzebumon.gif'],
    ['349BantyoLeomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/349BantyoLeomon.gif'],
    ['350Darkdramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/350Darkdramon.gif'],
    ['351Apocalymon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/351Apocalymon.gif'],
    ['352Ebemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/352Ebemon.gif'],
    ['353Galfmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/353Galfmon.gif'],
    ['354Goldramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/352Goldramon.gif'],
    ['355ZeedMillenniummon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/354ZeedMillenniummon.gif'],
    ['356DeathmonBlack', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/356DeathmonBlack.gif'],
    ['357Kuzuhamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/357Kuzuhamon.gif'],
    ['358ChaosDukemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/358ChaosDukemon.gif'],
    ['359MetalSeadramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/359MetalSeadramon.gif'],
    ['360Valkyrimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/360Valkyrimon.gif'],
    ['361Justimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/361Justimon.gif'],
    ['362Vikemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/362Vikemon.gif'],
    ['363BlackWarGreymon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/363BlackWarGreymon.gif'],
    ['364SkullMammon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/364SkullMammon.gif'],
    ['365GranKuwagamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/365GranKuwagamon.gif'],
    ['366Pharaohmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/366Pharaohmon.gif'],
    ['367Susanoomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/367Susanoomon.gif'],
    ['368Alphamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/368Alphamon.gif'],
    ['369Magnadramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/369Magnadramon.gif'],
    ['370Milleniummon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/370Milleniummon.gif'],
    ['371MoonMilleniummon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/371MoonMilleniummon.gif'],
    ['372Megidramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/372Megidramon.gif'],
    ['373Sleipmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/373Sleipmon.gif'],
    ['374ShineGreymon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/374ShineGreymon.gif'],
    ['375MirageGaogamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/375MirageGaogamon.gif'],
    ['376JumboGamemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/376JumboGamemon.gif'],
    ['377Ravemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/377Ravemon.gif'],
    ['378QueenChessmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/378QueenChessmon.gif'],
    ['379KingChessmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/379KingChessmon.gif'],
    ['380Chronomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/380Chronomon.gif'],
    ['381Lilithmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/381Lilithmon.gif'],
    ['382Varodurumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/382Varodurumon.gif'],
    ['383Apollomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/383Apollomon.gif'],
    ['384Dianamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/384Dianamon.gif'],
    ['385ShineGreymonBurst', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/385ShineGreymonBurst.gif'],
    ['386ShineGreymonRuin', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/386ShineGreymonRuin.gif'],
    ['387MirageGaogamonBurst', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/387MirageGaogamonBurst.gif'],
    ['388RavemonBurst', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/388RavemonBurst.gif'],
    ['389Lotusmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/389Lotusmon.gif'],
    ['392BeelzebumonBlaster', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/392BeelzebumonBlaster.gif'],
    ['393RosemonBurst', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/393RosemonBurst.gif'],
    ['394ArgomonUltimate', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/394ArgomonUltimate.gif'],
    ['395Minervamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/395Minervamon.gif'],
    ['396Duftmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/396Duftmon-1.gif'],
    ['397Chaosmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/397Chaosmon-1.gif'],
    ['398QuingLongmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/398QuingLongmon.gif'],
    ['399Zhuqiaomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/399Zhuqiaomon.gif'],
    ['400Baihumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/400Baihumon.gif'],
    ['401Xuanwumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/401Xuanwumon.gif'],
    ['402Belphemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/402Belphemon.gif'],
    ['403Daemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/403Daemon.gif'],
    ['404Barbamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/404Barbamon.gif'],
    ['405Leviamon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/405Leviamon.gif'],
    ['406ChronomonDM', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/406ChronomonDM.gif'],
    ['407GranLocomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/407GranLocomon.gif'],
    ['409Merukimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/409Merukimon.gif'],
    ['410SkullBarukimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/410SkullBarukimon.gif'],
    ['411Spinomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/411Spinomon.gif'],
    ['412WaruSeadramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/412WaruSeadramon.gif'],
    ['413Gaiomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/413Gaiomon.gif'],
    ['414GranDracmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/414GranDracmon.gif'],
    ['415ChaosDukemonCore', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/415ChaosDukemonCore.gif'],
    ['415OphanimonCore', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/415OphanimonCore.gif'],
    ['416Grimmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/416Grimmon.gif'],
    ['417ChaosGrimmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/417ChaosGrimmon.gif'],
    ['418ExoGrimmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Ultimate/418ExoGrimmon.gif'],
  ],
  Additions: [
    ['Aegisdramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Additions310311/Aegisdramon.gif'],
    ['Bastemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Additions310311/Bastemon.gif'],
    ['BeelzemonXros', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Additions310311/BeelzemonXros.gif'],
    ['Blastmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Additions310311/Blastmon.gif'],
    ['BlueMeramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Additions310311/BlueMeramon.gif'],
    ['Bommon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Additions310311/Bommon.gif'],
    ['Cerberumon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Additions310311/Cerberumon.gif'],
    ['Chaosdramon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Additions310311/Chaosdramon.gif'],
    ['Daipenmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Additions310311/Daipenmon.gif'],
    ['Dondokomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Additions310311/Dondokomon.gif'],
    ['Gaossmon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Additions310311/Gaossmon.gif'],
    ['GreymonXW', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Additions310311/GreymonXW.gif'],
    ['Lucemon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Additions310311/Lucemon.gif'],
    ['MadLeomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Additions310311/MadLeomon.gif'],
    ['Nefertimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Additions310311/Nefertimon.gif'],
    ['SkullScorpiomon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Additions310311/SkullScorpiomon.gif'],
    ['ShoutmonB', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Additions310311/ShoutmonB.gif'],
    ['Tactimon', 'http://i997.photobucket.com/albums/af96/WtWAnimatedSprites/Additions310311/Tactimon.gif'],
  ],
};

// Extract clean name from the key (remove number prefix)
function cleanName(key) {
  return key.replace(/^\d+/, '');
}

// Download a single file
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => { fileStream.close(); resolve(true); });
      fileStream.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// Main download function
async function downloadAll() {
  ensureDirs();

  let total = 0, success = 0, failed = 0;
  const failures = [];

  for (const [stage, sprites] of Object.entries(SPRITES)) {
    console.log(`\n=== Downloading ${stage} stage (${sprites.length} sprites) ===`);
    const stageDir = path.join(BASE_DIR, stage);

    for (const [key, url] of sprites) {
      total++;
      const name = cleanName(key);
      const destPath = path.join(stageDir, `${name}.gif`);

      // Skip if already downloaded
      if (fs.existsSync(destPath) && fs.statSync(destPath).size > 100) {
        console.log(`  [SKIP] ${name}.gif (already exists)`);
        success++;
        continue;
      }

      try {
        await downloadFile(url, destPath);
        const size = fs.statSync(destPath).size;
        if (size < 100) {
          fs.unlinkSync(destPath);
          throw new Error('File too small (likely error page)');
        }
        console.log(`  [OK] ${name}.gif (${(size / 1024).toFixed(1)}KB)`);
        success++;
      } catch (err) {
        console.error(`  [FAIL] ${name}.gif - ${err.message}`);
        failures.push({ name, url, error: err.message });
        failed++;
      }

      // Small delay to not hammer the server
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log(`\n========================================`);
  console.log(`Download complete!`);
  console.log(`  Total: ${total}`);
  console.log(`  Success: ${success}`);
  console.log(`  Failed: ${failed}`);
  if (failures.length > 0) {
    console.log(`\nFailed downloads:`);
    failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
  }

  // Count files per folder
  console.log(`\nFiles per folder:`);
  for (const stage of STAGES) {
    const dir = path.join(BASE_DIR, stage);
    if (fs.existsSync(dir)) {
      const count = fs.readdirSync(dir).filter(f => f.endsWith('.gif')).length;
      console.log(`  ${stage}: ${count} sprites`);
    }
  }
}

downloadAll().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
