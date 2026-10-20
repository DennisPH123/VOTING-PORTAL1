const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configure Multer for Nominee Photo Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// In-Memory Store for Categories, Nominees, and Votes
let votingData = {
    categories: [
        {
            id: "cat_1",
            name: "Best Head of Department",
            nominees: [
                { id: "nom_1", name: "John Doe", photo: "uploads/default.png", votes: 0 },
                { id: "nom_2", name: "Jane Smith", photo: "uploads/default.png", votes: 0 }
            ]
        }
    ]
};

// Track who has already voted
let votedTags = new Set();

// Complete 333 Verified Voter Database matching your exact document list
const VOTERS_DATABASE = [
  { tag: "ACT1505", name: "NYAE" },
  { tag: "ACT1508", name: "MAGOMA" },
  { tag: "ACT1534", name: "MANGI" },
  { tag: "ACT1541", name: "MAMBILI" },
  { tag: "ACT1546", name: "NGUMA" },
  { tag: "ACT1550", name: "GATHEE" },
  { tag: "ACT1552", name: "ACHOLA" },
  { tag: "ACT1553", name: "MANGI" },
  { tag: "ACT1554", name: "MBONDO" },
  { tag: "ACT1562", name: "IMBAIZA" },
  { tag: "ACT1564", name: "SADRUDINVALJI" },
  { tag: "ACT1565", name: "ONYANGO" },
  { tag: "ACT1567", name: "ORIKI" },
  { tag: "ACT1568", name: "MUSTAPHA" },
  { tag: "ACT1569", name: "DAMA" },
  { tag: "ACT1570", name: "OJIJO" },
  { tag: "ACT1571", name: "TOKA" },
  { tag: "ADM 010", name: "AMBANI" },
  { tag: "ADM 012", name: "OKOTH" },
  { tag: "ADM006", name: "KALSI" },
  { tag: "ADM007", name: "SINGH" },
  { tag: "ADM008", name: "JANDU" },
  { tag: "ADM011", name: "SALIMA" },
  { tag: "AN005", name: "KISU" },
  { tag: "AN006", name: "PIUS" },
  { tag: "AN007", name: "MBODZE" },
  { tag: "BCH3113", name: "AMENYA" },
  { tag: "BCH3124", name: "NEGE" },
  { tag: "BCH3701", name: "MUSENZE" },
  { tag: "BCH3702", name: "KAUNDU" },
  { tag: "BCH3711", name: "KATANA" },
  { tag: "BSC3719", name: "NYUNDO" },
  { tag: "BSC3720", name: "MNAZI" },
  { tag: "BSC3721", name: "MRISA" },
  { tag: "FBP", name: "MUDOGO" },
  { tag: "FBP501", name: "KILONZO" },
  { tag: "FBP502", name: "MENZA" },
  { tag: "FBP508", name: "SHANKAR" },
  { tag: "FBP510", name: "MOTAITA" },
  { tag: "FBP511", name: "SOO" },
  { tag: "FBP517", name: "KATHURU" },
  { tag: "FBP521", name: "MUSAVA" },
  { tag: "FBP527", name: "OBUONG" },
  { tag: "FBP531", name: "KUSSEMA" },
  { tag: "FBP534", name: "GONGA" },
  { tag: "FBP550", name: "JEFFAH" },
  { tag: "FBP561", name: "MUNYAO" },
  { tag: "FBP566", name: "MAZURI" },
  { tag: "FBP567", name: "AMBANI" },
  { tag: "FBP585", name: "CHOGO" },
  { tag: "FBP589", name: "MUSILA" },
  { tag: "FBP603", name: "OUMA" },
  { tag: "FBP609", name: "MWAHOZI" },
  { tag: "FBP725", name: "MUSYOKA" },
  { tag: "FBP727", name: "ODUOR" },
  { tag: "FBP730", name: "GEOFFREY" },
  { tag: "FBP740", name: "NANDWA" },
  { tag: "FBP748", name: "OUKO" },
  { tag: "FBP757", name: "MGISU" },
  { tag: "FBP760", name: "AWINO" },
  { tag: "FBP761", name: "MWASICHI" },
  { tag: "FBP762", name: "KIMOMO" },
  { tag: "FBP768", name: "SHIKANGA" },
  { tag: "FBP769", name: "KUNYAPA" },
  { tag: "FBP776", name: "WAKIO" },
  { tag: "FBP780", name: "PIERA" },
  { tag: "FBP783", name: "MWACHIDEGERE" },
  { tag: "FBP784", name: "KATENGEZI" },
  { tag: "FBP788", name: "MUYEKHO" },
  { tag: "FBP855", name: "MUTUA" },
  { tag: "FBP856", name: "ODHIAMBO" },
  { tag: "FBP857", name: "KIMANZI" },
  { tag: "FBP865", name: "HASSAN" },
  { tag: "FBP867", name: "MOGAKA" },
  { tag: "FBP 869", name: "WABULE" },
  { tag: "FBP 872", name: "OGOTI" },
  { tag: "FBP 873", name: "SOITA" },
  { tag: "FBP 874", name: "MUTUKU" },
  { tag: "FBP 881", name: "MGANDI" },
  { tag: "FBP 879", name: "ONDONG U" },
  { tag: "FBP888", name: "WERE" },
  { tag: "FBP889", name: "ODIRA" },
  { tag: "FBP892", name: "AKINYI" },
  { tag: "FBP893", name: "LIKOKWA" },
  { tag: "FBP894", name: "KULOVA" },
  { tag: "FBP895", name: "TUNU" },
  { tag: "FBP896", name: "OWANG" },
  { tag: "FBP899", name: "NTHUSI" },
  { tag: "FBP900", name: "MBUSYA" },
  { tag: "FBP901", name: "NZILU" },
  { tag: "FBP902", name: "MASIKA" },
  { tag: "FBP903", name: "OCHIENG" },
  { tag: "FBP904", name: "KOMBO" },
  { tag: "FBP905", name: "YOHANA" },
  { tag: "FPB906", name: "KITSAO" },
  { tag: "FBP907", name: "MUSYOKI" },
  { tag: "FBP908", name: "NANDWA" },
  { tag: "FBP909", name: "CHIGUBA" },
  { tag: "FBP910", name: "SAGALA" },
  { tag: "FBP911", name: "NGATU" },
  { tag: "FBP912", name: "MUYESI" },
  { tag: "FBP913", name: "SHARY" },
  { tag: "FBP914", name: "SHAMOLA" },
  { tag: "FBP915", name: "ZAKAYO" },
  { tag: "FBP916", name: "OGOTI" },
  { tag: "FBP917", name: "MBONDE" },
  { tag: "FBS1380", name: "MSHILLA" },
  { tag: "FBS1387", name: "MANGALE" },
  { tag: "FBS1706", name: "MURABU" },
  { tag: "FBS1711", name: "NG'ETICH" },
  { tag: "FBS1712", name: "NG'ANG'A" },
  { tag: "FBS1719", name: "PANDE" },
  { tag: "FBS1725", name: "MUTUA" },
  { tag: "FBS1726", name: "WEKESA" },
  { tag: "FBS1737", name: "AMWAYI" },
  { tag: "FBS1759", name: "OWITI" },
  { tag: "FBS1764", name: "SITATI" },
  { tag: "FBS1766", name: "WAMBUI" },
  { tag: "FBS1781", name: "MWAMFUKU" },
  { tag: "FBS1826", name: "MULANDI" },
  { tag: "FBS1831", name: "HOKA" },
  { tag: "FBS1845", name: "OKONG'O" },
  { tag: "FBS1853", name: "PATRICK" },
  { tag: "FBS1854", name: "SIMIYU" },
  { tag: "FBS1856", name: "BOI" },
  { tag: "FBS1857", name: "KISEU" },
  { tag: "FBS1859", name: "KARISA" },
  { tag: "FBS1861", name: "SAID" },
  { tag: "FBS790", name: "CHIMANDE" },
  { tag: "FBS854", name: "WAWERU" },
  { tag: "FBS860", name: "OSODO" },
  { tag: "FBS862", name: "KABERI" },
  { tag: "FBS866", name: "MUTUA" },
  { tag: "FBS868", name: "CLINTON" },
  { tag: "FBS870", name: "CAROLYNE" },
  { tag: "FBS872", name: "BRIAN" },
  { tag: "FBS873", name: "OSEKO" },
  { tag: "FBS878", name: "LUVUNO" },
  { tag: "FBS877", name: "JUMA" },
  { tag: "FBS882", name: "JACKSON" },
  { tag: "FBS883", name: "BETTY" },
  { tag: "FBS884", name: "KAMAU" },
  { tag: "FBS885", name: "NIVIAH" },
  { tag: "FBS886", name: "JOHN" },
  { tag: "FBS888", name: "AKINYI" },
  { tag: "FBS890", name: "KAI" },
  { tag: "FBS891", name: "CHIGAMBAH" },
  { tag: "FBS893", name: "WANJIKU" },
  { tag: "FBS894", name: "BRAX" },
  { tag: "FBS895", name: "NJUGUNA" },
  { tag: "FBS896", name: "CHITSETSE" },
  { tag: "FBS898", name: "MUSIMBI" },
  { tag: "FBS899", name: "CHEBOI" },
  { tag: "FBS900", name: "AWECH" },
  { tag: "FBS901", name: "HAMISI" },
  { tag: "FBS902", name: "LUDEKI" },
  { tag: "FBS903", name: "WANJIRU" },
  { tag: "FBS904", name: "OWUOR" },
  { tag: "FBS905", name: "GALGALLO" },
  { tag: "FOP319", name: "DINAH" },
  { tag: "FOP320", name: "MBUGUA" },
  { tag: "FOP321", name: "LENNOX" },
  { tag: "FOP 322", name: "EMODO" },
  { tag: "FOP 323", name: "MWACHALA" },
  { tag: "FOP202", name: "NYAMES" },
  { tag: "FOP217", name: "OMUMBWA" },
  { tag: "FOP229", name: "MBWANGI" },
  { tag: "FOP275", name: "MATUKHO" },
  { tag: "FOP276", name: "AWINO" },
  { tag: "FOP295", name: "KUYU" },
  { tag: "FOP303", name: "CHARO" },
  { tag: "FOP305", name: "JUSTUS" },
  { tag: "FOP306", name: "MOHAMED" },
  { tag: "FOP307", name: "MWACHUPA" },
  { tag: "FOP308", name: "NJOROGE" },
  { tag: "FOP310", name: "NEKESA" },
  { tag: "FOP312", name: "OGEMA" },
  { tag: "SCT3275", name: "OCHIENG" },
  { tag: "FOP313", name: "ADDE" },
  { tag: "FOP318", name: "KITENDO" },
  { tag: "FOP324", name: "VAMEDEVAN" },
  { tag: "HKS1003", name: "NDEDA" },
  { tag: "HKS1005", name: "JEFFAH" },
  { tag: "HKS1011", name: "WAMALWA" },
  { tag: "HKS1021", name: "ADIGO" },
  { tag: "HKS1036", name: "BAMBANYA" },
  { tag: "HKS1039", name: "MUTHAMA" },
  { tag: "HKS1045", name: "LUMBASI" },
  { tag: "HKS1066", name: "OGOMA" },
  { tag: "HR105", name: "KAVOGI" },
  { tag: "HR107", name: "MWINGA" },
  { tag: "HSK2063", name: "KIONI" },
  { tag: "HSK 2076", name: "KASHURU" },
  { tag: "HSK 2079", name: "ODWE" },
  { tag: "HSK 2080", name: "TABITHA" },
  { tag: "HSK1056", name: "PUNGU" },
  { tag: "HSK1061", name: "CHARO" },
  { tag: "HSK1067", name: "OCHIENG" },
  { tag: "HSK1080", name: "SILINGI" },
  { tag: "HSK1085", name: "MURIITHI" },
  { tag: "HSK1097", name: "DZOMBO" },
  { tag: "HSK1986", name: "NJERU" },
  { tag: "HSK1987", name: "OKELO" },
  { tag: "HSK1990", name: "MTAWALI" },
  { tag: "HSK1996", name: "OLOO" },
  { tag: "HSK2004", name: "ALEX" },
  { tag: "HSK2006", name: "KITIVI" },
  { tag: "HSK2007", name: "BOKE" },
  { tag: "HSK2008", name: "ODWE" },
  { tag: "HSK2010", name: "NAMAKHELO" },
  { tag: "HSK2011", name: "NGESO" },
  { tag: "HSK2014", name: "JAMES" },
  { tag: "HSK2015", name: "OMOLO" },
  { tag: "HSK2020", name: "NYAMWATA" },
  { tag: "HSK2021", name: "AKINYI" },
  { tag: "HSK2022", name: "KATAMA" },
  { tag: "HSK2028", name: "KARIE" },
  { tag: "HSK2031", name: "NDIRANGU" },
  { tag: "HSK2040", name: "MUTUGI" },
  { tag: "HSK2044", name: "TOLO" },
  { tag: "HSK2045", name: "SAID" },
  { tag: "HSK2047", name: "CHIGIRI" },
  { tag: "HKS2046", name: "OUKO" },
  { tag: "HSK2052", name: "ABEA" },
  { tag: "HSK2054", name: "NDARO" },
  { tag: "HSK2066", name: "KAHINDI" },
  { tag: "HSK2068", name: "MWAKUKOSA" },
  { tag: "HSK2069", name: "MWADZONDO" },
  { tag: "HSK2070", name: "OTIENO" },
  { tag: "HSK2071", name: "OTIENO" },
  { tag: "HSK2072", name: "OUMA" },
  { tag: "HSK2073", name: "MBUDI" },
  { tag: "HSK2075", name: "THOYA" },
  { tag: "HSK2076", name: "CECILIA" },
  { tag: "HSK2077", name: "ODHIAMBO" },
  { tag: "HSK2078", name: "KARIMA" },
  { tag: "HSK2081", name: "KARUGU" },
  { tag: "ICT111", name: "MUSANGO" },
  { tag: "ICT112", name: "KYALO" },
  { tag: "ICT113", name: "MAUNDU" },
  { tag: "RMT3307", name: "MBUVI" },
  { tag: "RMT 3309", name: "ANZAYA" },
  { tag: "RMT 3310", name: "KATANA" },
  { tag: "RMT 3311", name: "BOFULA" },
  { tag: "RMT2504", name: "NICHOLAS" },
  { tag: "RMT2506", name: "PILI" },
  { tag: "RMT2507", name: "NGONI" },
  { tag: "RMT2512", name: "ZOKA" },
  { tag: "RMT2516", name: "RASHID" },
  { tag: "RMT2527", name: "MWASIGWA" },
  { tag: "RMT2529", name: "MWAKULALA" },
  { tag: "RMT2531", name: "CHARO" },
  { tag: "RMT2537", name: "KAURE" },
  { tag: "RMT2553", name: "SHIBE" },
  { tag: "RMT2555", name: "SHIBE" },
  { tag: "RMT2558", name: "MWACHINALO" },
  { tag: "RMT3004", name: "SHIBE" },
  { tag: "RMT3257", name: "NYUNDO" },
  { tag: "RMT3258", name: "MWARUWA" },
  { tag: "RMT3259", name: "MWASHANDO" },
  { tag: "RMT3262", name: "NJOROGE" },
  { tag: "RMT3263", name: "MWAPONDA" },
  { tag: "RMT3264", name: "KAVOI" },
  { tag: "RMT3270", name: "MWAVUO" },
  { tag: "RMT3276", name: "KABAHA" },
  { tag: "RMT3277", name: "BEJA" },
  { tag: "RMT3280", name: "MWASIMO" },
  { tag: "RMT3282", name: "RUMU" },
  { tag: "RMT3283", name: "MWAKURICHWA" },
  { tag: "RMT3284", name: "BOI" },
  { tag: "RMT3290", name: "HARE" },
  { tag: "RMT3291", name: "NDITHYA" },
  { tag: "RMT3299", name: "BEJA" },
  { tag: "RMT3301", name: "MKARE" },
  { tag: "RMT3302", name: "SHABANI" },
  { tag: "RMT3303", name: "KARISA" },
  { tag: "RMT3304", name: "MWAMNYETO" },
  { tag: "RMT3305", name: "RUWA" },
  { tag: "RMT3306", name: "KALINGA" },
  { tag: "RMT3308", name: "MZUNGU" },
  { tag: "RMT3309", name: "OPON" },
  { tag: "SCT 3338", name: "WILFRED" },
  { tag: "SCT 3339", name: "SEKUTON" },
  { tag: "SCT3214", name: "CHAACHA" },
  { tag: "SCT3226", name: "SAFARI" },
  { tag: "SCT3244", name: "SILETA" },
  { tag: "SCT3255", name: "NDAUKA" },
  { tag: "SCT3264", name: "LOLDOMET" },
  { tag: "SCT3272", name: "LELEKUMANI" },
  { tag: "SCT3280", name: "LELENGUIYIA" },
  { tag: "SCT3288", name: "LERSO" },
  { tag: "SCT3296", name: "SENI" },
  { tag: "SCT3304", name: "OTIENO" },
  { tag: "SCT3307", name: "ZACHARIAH" },
  { tag: "SCT3309", name: "ODIAGA" },
  { tag: "SCT3312", name: "KIMILU" },
  { tag: "SCT3315", name: "MUITHYA" },
  { tag: "SCT3316", name: "CHEPTAI" },
  { tag: "SCT3319", name: "ONDIMU" },
  { tag: "SCT3320", name: "KUBAMBANYA" },
  { tag: "SCT3321", name: "GWONDA" },
  { tag: "SCT3324", name: "LETIYALO" },
  { tag: "SCT3325", name: "WANJALA" },
  { tag: "SCT3326", name: "MWANGI" },
  { tag: "SCT3327", name: "TUWANO" },
  { tag: "SCT3330", name: "MASEA" },
  { tag: "SCT3330", name: "Omare" },
  { tag: "SCT3331", name: "MUTAVI" },
  { tag: "SCT3332", name: "MWANYAE" },
  { tag: "SCT3333", name: "SUTER" },
  { tag: "SCT3334", name: "NYANGARESI" },
  { tag: "SCT3335", name: "MWAMSEMA" },
  { tag: "SCT3336", name: "KALUME" },
  { tag: "SCT3337", name: "LWAYO" },
  { tag: "SCT3334", name: "OGETA" },
  { tag: "SCT3339", name: "CHEMONGES" },
  { tag: "SCT3340", name: "LESAJORE" },
  { tag: "SCT3341", name: "RAMA" },
  { tag: "SCT3342", name: "MOHAMED" },
  { tag: "SCT3343", name: "NURI" },
  { tag: "SCT3344", name: "NYARIBO" },
  { tag: "SPA123", name: "ODONGO" },
  { tag: "SPA3238", name: "MWAI" },
  { tag: "SPA3245", name: "ONDUTO" },
  { tag: "SPA3249", name: "WANJIRU" },
  { tag: "SPA3250", name: "MWAHANJE" },
  { tag: "SPA3251", name: "INONDI" },
  { tag: "SPA3254", name: "GUDA" },
  { tag: "SPA3256", name: "OMORO" },
  { tag: "SPA3259", name: "NDUTA" },
  { tag: "SPA3260", name: "OCHIENG" },
  { tag: "SPA3258", name: "NYANJE" },
  { tag: "SPA3261", name: "SHIDIKHA" }
];

// Login Endpoint
app.post('/api/login', (req, res) => {
    const { tag } = req.body;
    if (!tag) return res.status(400).json({ success: false, message: "Provide employee number." });
    
    const cleanInputTag = tag.toString().trim().toUpperCase().replace(/\s+/g, '');
    const voter = VOTERS_DATABASE.find(v => v.tag.trim().toUpperCase().replace(/\s+/g, '') === cleanInputTag);
    
    if (!voter) {
        return res.status(401).json({ success: false, message: "Invalid Employee Number." });
    }

    if (votedTags.has(voter.tag)) {
        return res.status(403).json({ success: false, message: "You have already voted!" });
    }

    res.json({ success: true, voter });
});

app.post('/api/admin-login', (req, res) => {
    const { password } = req.body;
    if (password === "admin123") {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: "Incorrect password" });
    }
});

app.get('/api/voting-data', (req, res) => {
    res.json(votingData);
});

app.post('/api/admin/category', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Category name required." });
    const newCategory = { id: 'cat_' + Date.now(), name, nominees: [] };
    votingData.categories.push(newCategory);
    res.json({ success: true, votingData });
});

app.delete('/api/admin/category/:id', (req, res) => {
    votingData.categories = votingData.categories.filter(c => c.id !== req.params.id);
    res.json({ success: true, votingData });
});

app.post('/api/admin/nominee', upload.single('photo'), (req, res) => {
    const categoryId = req.body.categoryId;
    const nomineeName = req.body.name || req.body.nomineeName || req.body.fullName;
    const photoPath = req.file ? `uploads/${req.file.filename}` : 'uploads/default.png';

    if (!nomineeName) {
        return res.status(400).json({ success: false, message: "Nominee name is required." });
    }

    const category = votingData.categories.find(c => c.id === categoryId);
    if (category) {
        category.nominees.push({
            id: 'nom_' + Date.now(),
            name: nomineeName,
            photo: photoPath,
            votes: 0
        });
        res.json({ success: true, votingData });
    } else {
        res.status(404).json({ success: false, message: "Category not found." });
    }
});

app.delete('/api/admin/nominee/:categoryId/:nomineeId', (req, res) => {
    const category = votingData.categories.find(c => c.id === req.params.categoryId);
    if (category) {
        category.nominees = category.nominees.filter(n => n.id !== req.params.nomineeId);
        res.json({ success: true, votingData });
    } else {
        res.status(404).json({ success: false, message: "Category not found." });
    }
});

// Updated Vote Endpoint for individual category/nominee increments
app.post('/api/vote', (req, res) => {
    const { tag, categoryId, nomineeId } = req.body;
    
    if (!tag) {
        return res.status(400).json({ success: false, message: "Voter tag missing." });
    }

    const cleanTag = tag.toString().trim().toUpperCase().replace(/\s+/g, '');
    const voter = VOTERS_DATABASE.find(v => v.tag.trim().toUpperCase().replace(/\s+/g, '') === cleanTag);

    if (!voter) {
        return res.status(401).json({ success: false, message: "Invalid voter." });
    }

    if (votedTags.has(voter.tag)) {
        return res.status(403).json({ success: false, message: "You have already voted!" });
    }

    const category = votingData.categories.find(c => c.id === categoryId);
    if (category) {
        const nominee = category.nominees.find(n => n.id === nomineeId);
        if (nominee) {
            nominee.votes += 1;
        }
    }

    votedTags.add(voter.tag);
    res.json({ success: true, message: "Vote recorded successfully!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));