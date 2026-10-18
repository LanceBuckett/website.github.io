// --- Calibration Standards Data ---
export let calibrationStandards = [
    { id: "Std_0.1_Rep1", amountRatio: 0.1, analyteArea: 50200, isArea: 500000 },
    { id: "Std_0.1_Rep2", amountRatio: 0.1, analyteArea: 49800, isArea: 500000 },
    { id: "Std_0.1_Rep3", amountRatio: 0.1, analyteArea: 50000, isArea: 500000 },
    { id: "Std_0.25_Rep1", amountRatio: 0.25, analyteArea: 125500, isArea: 500000 },
    { id: "Std_0.25_Rep2", amountRatio: 0.25, analyteArea: 124200, isArea: 500000 },
    { id: "Std_0.25_Rep3", amountRatio: 0.25, analyteArea: 125300, isArea: 500000 },
    { id: "Std_0.5_Rep1", amountRatio: 0.5, analyteArea: 251000, isArea: 500000 },
    { id: "Std_0.5_Rep2", amountRatio: 0.5, analyteArea: 249200, isArea: 500000 },
    { id: "Std_0.5_Rep3", amountRatio: 0.5, analyteArea: 250100, isArea: 500000 },
    { id: "Std_1.0_Rep1", amountRatio: 1.0, analyteArea: 501500, isArea: 500000 },
    { id: "Std_1.0_Rep2", amountRatio: 1.0, analyteArea: 498800, isArea: 500000 },
    { id: "Std_1.0_Rep3", amountRatio: 1.0, analyteArea: 500200, isArea: 500000 }
];

export let unknownDataset = [
    { id: "Unknown_A", analyteArea: 150000, isArea: 500000 },
    { id: "Unknown_B", analyteArea: 375000, isArea: 500000 },
    { id: "Unknown_C", analyteArea: 600000, isArea: 500000 }
];

export const ELEMENT_DATA = {
    'H':  { mono: 1.007825032, avg: 1.008 },
    'D':  { mono: 2.014101778, avg: 2.014 },
    'C':  { mono: 12.00000000, avg: 12.011 },
    '13C':{ mono: 13.00335483, avg: 13.003 },
    'N':  { mono: 14.00307400, avg: 14.007 },
    '15N':{ mono: 15.00010889, avg: 15.000 },
    'O':  { mono: 15.99491462, avg: 15.999 },
    '18O':{ mono: 17.99916100, avg: 17.999 },
    'P':  { mono: 30.97376199, avg: 30.974 },
    'S':  { mono: 31.97207117, avg: 32.06 },
    'Cl': { mono: 34.96885268, avg: 35.45 },
    'Br': { mono: 78.9183371,  avg: 79.904 },
    'I':  { mono: 126.904473,  avg: 126.90 }
};

export const AA_SMILES = {
    'A': 'NC(C)C(=O)', 'R': 'NC(CCCNC(=N)N)C(=O)', 'N': 'NC(CC(=O)N)C(=O)', 'D': 'NC(CC(=O)O)C(=O)',
    'C': 'NC(CS)C(=O)', 'E': 'NC(CCC(=O)O)C(=O)', 'Q': 'NC(CCC(=O)N)C(=O)', 'G': 'NCC(=O)',
    'H': 'NC(CC1=CN=CN1)C(=O)', 'I': 'NC(C(CC)C)C(=O)', 'L': 'NC(CC(C)C)C(=O)', 'K': 'NC(CCCCN)C(=O)',
    'M': 'NC(CCSC)C(=O)', 'F': 'NC(CC1=CC=CC=C1)C(=O)', 'P': 'N1CCCC1C(=O)', 'S': 'NC(CO)C(=O)',
    'T': 'NC(C(O)C)C(=O)', 'W': 'NC(CC1=CNC2=CC=CC=C21)C(=O)', 'Y': 'NC(CC1=CC=C(O)C=C1)C(=O)', 'V': 'NC(C(C)C)C(=O)'
};

export function getAveragedStandards() {
    let grouped = {};
    calibrationStandards.forEach(std => {
        if (!grouped[std.amountRatio]) {
            grouped[std.amountRatio] = { amountRatio: std.amountRatio, ratios: [] };
        }
        let ratio = std.isArea > 0 ? (std.analyteArea / std.isArea) : 0;
        grouped[std.amountRatio].ratios.push(ratio);
    });

    let averagedPoints = [];
    for (let ratioKey in grouped) {
        let ratios = grouped[ratioKey].ratios;
        let n = ratios.length;
        let sum = ratios.reduce((a, b) => a + b, 0);
        let mean = n > 0 ? sum / n : 0;
        
        let variance = 0;
        if (n > 1) {
            variance = ratios.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n - 1);
        }
        let sd = Math.sqrt(variance);
        let sem = n > 0 ? sd / Math.sqrt(n) : 0;

        averagedPoints.push({
            amountRatio: parseFloat(ratioKey),
            avgRatio: mean,
            sd: sd,
            sem: sem
        });
    }
    averagedPoints.sort((a, b) => a.amountRatio - b.amountRatio);
    return averagedPoints;
}

export function calculateLinearRegression() {
    let averagedPoints = getAveragedStandards();
    let n = averagedPoints.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;

    averagedPoints.forEach(pt => {
        let x = pt.amountRatio;
        let y = pt.avgRatio;

        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
        sumYY += y * y;
    });

    let slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) : 0;
    let intercept = n > 1 ? (sumY - slope * sumX) / n : 0;

    let ssTotal = sumYY - (sumY * sumY) / n;
    let ssResid = sumYY - intercept * sumY - slope * sumXY;
    let r2 = ssTotal !== 0 ? 1 - (ssResid / ssTotal) : 0;

    return { slope, intercept, r2, averagedPoints };
}

export function parseCalibrationTextData(text) {
    const lines = text.split(/\r\n|\n/);
    const newStandards = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('#') || line.toLowerCase().includes('amount') || line.toLowerCase().includes('standard')) continue;

        const parts = line.split(/[\t,\s]+/);
        if (parts.length >= 4) {
            const id = parts[0];
            const amountRatio = parseFloat(parts[1]);
            const analyteArea = parseFloat(parts[2]);
            const isArea = parseFloat(parts[3]);

            if (!isNaN(amountRatio) && !isNaN(analyteArea) && !isNaN(isArea)) {
                newStandards.push({ id, amountRatio, analyteArea, isArea });
            }
        }
    }

    if (newStandards.length > 0) {
        calibrationStandards.length = 0;
        Array.prototype.push.apply(calibrationStandards, newStandards);
        return { success: true, count: newStandards.length };
    }
    return { success: false, count: 0 };
}

export function parseSmilesComposition(smiles) {
    let counts = {};
    let i = 0;

    while (i < smiles.length) {
        let char = smiles[i];

        if (char === '[') {
            let closeIdx = smiles.indexOf(']', i);
            if (closeIdx === -1) throw new Error("Unclosed bracket '[' in SMILES");

            let bracketContent = smiles.substring(i + 1, closeIdx);
            let match = bracketContent.match(/^(13)?([A-Z][a-z]?)(H\d*)?/);
            if (match) {
                let isotope = match[1] || "";
                let sym = match[2];
                let hMatch = match[3];

                let key = isotope ? `${isotope}${sym}` : sym;
                counts[key] = (counts[key] || 0) + 1;

                if (hMatch) {
                    let hCount = hMatch.length > 1 ? parseInt(hMatch.substring(1)) : 1;
                    counts['H'] = (counts['H'] || 0) + hCount;
                }
            }
            i = closeIdx + 1;
            continue;
        }

        if (i + 1 < smiles.length && (smiles.substring(i, i+2) === 'Cl' || smiles.substring(i, i+2) === 'Br')) {
            let elem = smiles.substring(i, i+2);
            counts[elem] = (counts[elem] || 0) + 1;
            i += 2;
            continue;
        }

        if (/[CNOPSFIBc n o s p]/.test(char)) {
            let elem = char.toUpperCase();
            counts[elem] = (counts[elem] || 0) + 1;
            i++;
            continue;
        }

        i++;
    }

    return counts;
}

export function formatFormulaHTML(counts) {
    let html = "";
    let order = ['C', '13C', 'H', 'D', 'N', '15N', 'O', '18O', 'P', 'S', 'Cl', 'Br', 'I'];
    
    let keys = Object.keys(counts).sort((a, b) => {
        let idxA = order.indexOf(a);
        let idxB = order.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        return a.localeCompare(b);
    });

    keys.forEach(k => {
        let val = counts[k];
        html += `${k}${val > 1 ? `<sub>${val}</sub>` : ''}`;
    });

    return html || "—";
}

export function peptideToSmilesString(seqInput) {
    let seq = seqInput.trim().toUpperCase().replace(/[^A-Z]/g, '');
    if (!seq) return "";

    let peptideSmiles = "N";
    for (let i = 0; i < seq.length; i++) {
        let aa = seq[i];
        let sideChain = "";
        
        switch(aa) {
            case 'A': sideChain = "C"; break;
            case 'R': sideChain = "CCCNC(=N)N"; break;
            case 'N': sideChain = "CC(=O)N"; break;
            case 'D': sideChain = "CC(=O)O"; break;
            case 'C': sideChain = "CS"; break;
            case 'E': sideChain = "CCC(=O)O"; break;
            case 'Q': sideChain = "CCC(=O)N"; break;
            case 'G': sideChain = ""; break;
            case 'H': sideChain = "CC1=CN=CN1"; break;
            case 'I': sideChain = "C(CC)C"; break;
            case 'L': sideChain = "CC(C)C"; break;
            case 'K': sideChain = "CCCCN"; break;
            case 'M': sideChain = "CCSC"; break;
            case 'F': sideChain = "CC1=CC=CC=C1"; break;
            case 'P': sideChain = "N1CCCC1"; break;
            case 'S': sideChain = "CO"; break;
            case 'T': sideChain = "C(O)C"; break;
            case 'W': sideChain = "CC1=CNC2=CC=CC=C21"; break;
            case 'Y': sideChain = "CC1=CC=C(O)C=C1"; break;
            case 'V': sideChain = "C(C)C"; break;
            default: sideChain = "C";
        }

        if (aa === 'G') {
            peptideSmiles += "CC(=O)N";
        } else {
            peptideSmiles += `C(${sideChain})C(=O)N`;
        }
    }
    return peptideSmiles.substring(0, peptideSmiles.length - 1) + "C(=O)O";
}