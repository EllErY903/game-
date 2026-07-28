// words.js
// Slovní zásoba pro hru Čelovka.
// Přidání nové kategorie: stačí přidat nový klíč s polem alespoň ~60 slov.
const WORD_CATEGORIES = {
  "Zvířata": [
    "pes", "kočka", "kůň", "kráva", "prase", "ovce", "koza", "slepice", "kachna", "husa",
    "krocan", "králík", "myš", "krysa", "křeček", "morče", "pavouk", "moucha", "komár", "včela",
    "vosa", "mravenec", "motýl", "beruška", "žížala", "had", "ještěrka", "krokodýl", "aligátor", "želva",
    "žralok", "delfín", "velryba", "tuleň", "mrož", "tučňák", "orel", "sokol", "sova", "vrána",
    "holub", "vrabec", "čáp", "plameňák", "páv", "papoušek", "tygr", "lev", "slon", "žirafa",
    "zebra", "nosorožec", "hroch", "opice", "gorila", "šimpanz", "medvěd", "panda", "vlk", "liška",
    "jelen", "srnec", "kanec", "jezevec", "veverka", "ježek", "krtek", "netopýr", "losos", "kapr"
  ],
  "Filmy a seriály": [
    "Titanic", "Avatar", "Matrix", "Ledové království", "Shrek", "Simpsonovi", "Přátelé", "Hra o trůny", "Duna", "Interstellar",
    "Gladiátor", "Rocky", "Terminátor", "Vetřelec", "Predátor", "Jurský park", "Harry Potter", "Pán prstenů", "Hobit", "Star Wars",
    "Avengers", "Batman", "Spider-Man", "Superman", "Joker", "Pulp Fiction", "Forrest Gump", "Kmotr", "Casablanca", "Psycho",
    "Čelisti", "King Kong", "Godzilla", "Toy Story", "Auta", "Coco", "Zootropolis", "Kráska a zvíře", "Aladin", "Král lev",
    "Sto jedna dalmatinů", "Sněhurka", "Popelka", "Mrazík", "S čerty nejsou žerty", "Pelíšky", "Kolja", "Vesničko má středisková", "Slunce, seno, jahody", "Marečku, podejte mi pero",
    "Byl jednou jeden král", "Tři oříšky pro Popelku", "Anděl Páně", "Sherlock Holmes", "Doktor House", "Breaking Bad", "Stranger Things", "Peaky Blinders", "Vikingové", "Černobyl",
    "Kobra 11", "Ulice", "Ordinace v růžové zahradě", "Downton Abbey", "Piráti z Karibiku"
  ],
  "Slavné osobnosti": [
    "Albert Einstein", "Isaac Newton", "Charles Darwin", "Nikola Tesla", "Leonardo da Vinci", "Wolfgang Amadeus Mozart", "Ludwig van Beethoven", "William Shakespeare", "Napoleon Bonaparte", "Julius Caesar",
    "Kleopatra", "Marie Curie", "Charlie Chaplin", "Elvis Presley", "Michael Jackson", "Freddie Mercury", "John Lennon", "Elton John", "Madonna", "Beyoncé",
    "Adele", "Taylor Swift", "Lionel Messi", "Cristiano Ronaldo", "Usain Bolt", "Muhammad Ali", "Pelé", "Serena Williams", "Roger Federer", "Václav Havel",
    "Tomáš Garrigue Masaryk", "Karel IV.", "Jan Hus", "Antonín Dvořák", "Bedřich Smetana", "Franz Kafka", "Karel Čapek", "Jaroslav Hašek", "Emil Zátopek", "Jaromír Jágr",
    "Dominik Hašek", "Petr Čech", "Karel Gott", "Helena Vondráčková", "Marta Kubišová", "Jára Cimrman", "Steve Jobs", "Bill Gates", "Elon Musk", "Walt Disney",
    "Pablo Picasso", "Vincent van Gogh", "Salvador Dalí", "Michelangelo", "Abraham Lincoln", "George Washington", "Winston Churchill", "Mahátmá Gándhí", "Nelson Mandela", "Matka Tereza",
    "Kryštof Kolumbus", "Marco Polo", "Galileo Galilei", "Sigmund Freud", "Alfred Hitchcock"
  ],
  "Povolání": [
    "lékař", "zdravotní sestra", "učitel", "hasič", "policista", "voják", "právník", "soudce", "kadeřník", "kuchař",
    "číšník", "pekař", "řezník", "prodavač", "pokladní", "řidič autobusu", "taxikář", "pilot", "letuška", "kapitán lodi",
    "rybář", "zemědělec", "včelař", "zahradník", "tesař", "zedník", "elektrikář", "instalatér", "malíř pokojů", "švadlena",
    "krejčí", "obuvník", "hodinář", "zlatník", "architekt", "inženýr", "programátor", "grafický designér", "novinář", "spisovatel",
    "fotograf", "herec", "zpěvák", "hudebník", "sochař", "tanečník", "komik", "moderátor", "DJ", "veterinář",
    "zubař", "lékárník", "psycholog", "sociální pracovník", "účetní", "bankéř", "pojišťovák", "makléř", "manažer", "sekretářka",
    "recepční", "uklízečka", "popelář", "horník", "astronaut"
  ],
  "Jídlo a pití": [
    "chleba", "houska", "rohlík", "knedlík", "svíčková", "guláš", "řízek", "bramborák", "palačinka", "koláč",
    "buchta", "štrúdl", "trdelník", "párek", "klobása", "šunka", "salám", "sýr", "tvaroh", "jogurt",
    "máslo", "vejce", "mléko", "smetana", "med", "marmeláda", "čokoláda", "zmrzlina", "dort", "sušenka",
    "chipsy", "popcorn", "pizza", "těstoviny", "rýže", "brambory", "polévka", "salát", "rajče", "okurka",
    "cibule", "česnek", "paprika", "mrkev", "jablko", "hruška", "banán", "pomeranč", "citron", "jahoda",
    "malina", "borůvka", "meloun", "hroznové víno", "ananas", "kokos", "ořechy", "mandle", "pivo", "víno",
    "becherovka", "slivovice", "rum", "whisky", "káva"
  ],
  "Sport": [
    "fotbal", "hokej", "tenis", "basketbal", "volejbal", "florbal", "házená", "ragby", "americký fotbal", "baseball",
    "golf", "biatlon", "běžky", "sjezdové lyžování", "snowboarding", "bruslení", "plavání", "skoky do vody", "veslování", "kanoistika",
    "atletika", "běh", "maraton", "skok do dálky", "skok vysoký", "hod oštěpem", "vrh koulí", "gymnastika", "krasobruslení", "box",
    "judo", "karate", "taekwondo", "zápas", "šerm", "kulturistika", "cyklistika", "triatlon", "horolezectví", "lezení na skalách",
    "jachting", "surfing", "potápění", "šipky", "kulečník", "stolní tenis", "badminton", "squash", "kuželky", "bowling",
    "jóga", "fitness", "aerobik", "jízda na koni", "motokros", "formule 1", "rallye", "curling", "softball", "street workout",
    "parkour", "skateboarding", "lukostřelba", "vzpírání", "orientační běh"
  ],
  "Věci v domácnosti": [
    "postel", "polštář", "deka", "peřina", "skříň", "stůl", "židle", "pohovka", "křeslo", "koberec",
    "závěsy", "lampa", "žárovka", "zrcadlo", "obraz", "hodiny", "televize", "lednice", "mikrovlnka", "trouba",
    "sporák", "myčka", "pračka", "sušička", "vysavač", "žehlička", "konvice", "hrnec", "pánev", "talíř",
    "hrnek", "sklenice", "vidlička", "nůž", "lžíce", "prkénko", "utěrka", "koš na odpadky", "kartáč", "koště",
    "mop", "ubrousek", "ubrus", "polička", "komoda", "věšák", "klíče", "deštník", "budík", "telefon",
    "notebook", "tiskárna", "sešívačka", "nůžky", "svíčka", "váza", "květináč", "ručník", "mýdlo", "kartáček na zuby",
    "toaletní papír", "prádlo", "botník", "sada nádobí", "žaluzie"
  ],
  "Česká specialita": [
    "Karlův most", "Pražský hrad", "Karlštejn", "Český Krumlov", "Vltava", "Krkonoše", "Šumava", "Moravský kras", "Punkevní jeskyně", "Lednicko-valtický areál",
    "Kutná Hora", "Telč", "Olomouc", "Brno", "Plzeň", "Ostrava", "Karlovy Vary", "Mariánské Lázně", "Adršpašské skály", "Máchovo jezero",
    "Orlík", "Zvíkov", "Křivoklát", "Krtek", "Bob a Bobek", "Pat a Mat", "Rumcajs", "Křemílek a Vochomůrka", "Maková panenka", "Večerníček",
    "Čtyřlístek", "Divadlo Járy Cimrmana", "Národní divadlo", "Staroměstský orloj", "Petřínská rozhledna", "Vyšehrad", "Žižkov", "Staroměstské náměstí", "Václavské náměstí", "Dobrý voják Švejk",
    "Krakonoš", "Ještěd", "Sněžka", "Lipno", "Kolín", "Zlín", "Baťa", "Škodovka", "Plzeňský Prazdroj", "Budvar",
    "Kofola", "hospoda", "vodník", "Rusalka", "Golem", "Babička (Boženy Němcové)", "Mikuláš", "čert a anděl", "pomlázka", "kraslice",
    "vánočka", "kapr na Vánoce", "Tři králové", "Malá Strana", "Hradčany"
  ],
  "Hra o trůny": [
    "Jon Snow", "Daenerys Targaryen", "Tyrion Lannister", "Cersei Lannister", "Jaime Lannister", "Sansa Stark", "Arya Stark", "Bran Stark", "Ned Stark", "Catelyn Stark",
    "Robb Stark", "Theon Greyjoy", "Joffrey Baratheon", "Robert Baratheon", "Stannis Baratheon", "Melisandra", "Malíček", "Varys", "Samwell Tarly", "Brienne z Tarthu",
    "Ohař", "Hora", "Bronn", "Davos Seaworth", "Margaery Tyrell", "Olenna Tyrell", "Tywin Lannister", "Ramsay Bolton", "Roose Bolton", "Khal Drogo",
    "Missandei", "Šedý červ", "Jorah Mormont", "Tormund", "Ygritte", "Hodor", "Podrick Payne", "Ellaria Sand", "Oberyn Martell", "Gendry",
    "Shae", "Meera Reed", "Jojen Reed", "Beric Dondarrion", "Thoros z Myru", "Yara Greyjoy", "Euron Greyjoy", "Balon Greyjoy", "Viserys Targaryen", "Rhaegar Targaryen",
    "Šílený král", "Drogon", "Rhaegal", "Viserion", "Nymeria", "Duch", "Šedý vítr", "Léto", "Bran Zlomený", "Noční král",
    "Qyburn", "Vysoký vrabčák", "Lyanna Stark", "Benjen Stark", "Gilly"
  ]
};
