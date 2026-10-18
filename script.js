// --- Calibration Standards Data ---
let calibrationStandards = [
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

let unknownDataset = [
    { id: "Unknown_A", analyteArea: 150000, isArea: 500000 },
    { id: "Unknown_B", analyteArea: 375000, isArea: 500000 },
    { id: "Unknown_C", analyteArea: 600000, isArea: 500000 }
];

let calibrationChartInstance = null;

const ELEMENT_DATA = {
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

const AA_SMILES = {
    'A': 'NC(C)C(=O)',
    'R': 'NC(CCCNC(=N)N)C(=O)',
    'N': 'NC(CC(=O)N)C(=O)',
    'D': 'NC(CC(=O)O)C(=O)',
    'C': 'NC(CS)C(=O)',
    'E': 'NC(CCC(=O)O)C(=O)',
    'Q': 'NC(CCC(=O)N)C(=O)',
    'G': 'NCC(=O)',
    'H': 'NC(CC1=CN=CN1)C(=O)',
    'I': 'NC(C(CC)C)C(=O)',
    'L': 'NC(CC(C)C)C(=O)',
    'K': 'NC(CCCCN)C(=O)',
    'M': 'NC(CCSC)C(=O)',
    'F': 'NC(CC1=CC=CC=C1)C(=O)',
    'P': 'N1CCCC1C(=O)',
    'S': 'NC(CO)C(=O)',
    'T': 'NC(C(O)C)C(=O)',
    'W': 'NC(CC1=CNC2=CC=CC=C21)C(=O)',
    'Y': 'NC(CC1=CC=C(O)C=C1)C(=O)',
    'V': 'NC(C(C)C)C(=O)'
};

// --- Safe DOM Content Loaded Initialization ---
window.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('standardsBody')) {
        renderCalculator();
    }
    if (document.getElementById('peptideInput')) {
        convertPeptideToSmiles();
    } else if (document.getElementById('smilesInput')) {
        convertSmilesToMass();
    }
});

function switchPage(pageId) {
    document.querySelectorAll('.page-view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('nav a').forEach(el => el.classList.remove('active'));
    
    const targetPage = document.getElementById('page-' + pageId);
    if (targetPage) targetPage.classList.add('active');
    
    const activeNav = document.getElementById('nav-' + pageId);
    if (activeNav) activeNav.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if(pageId === 'calculator') {
        renderCalculator();
    } else if(pageId === 'smiles') {
        convertPeptideToSmiles();
    }
}

function renderCalculator() {
    renderStandardsTable();
    const regression = calculateLinearRegression();
    renderChart(regression);
    renderUnknownsTable(regression);
}

function renderStandardsTable() {
    const tbody = document.getElementById('standardsBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    calibrationStandards.forEach((std, index) => {
        const ratio = std.isArea > 0 ? (std.analyteArea / std.isArea) : 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" value="${std.id}" onchange="updateStandard(${index}, 'id', this.value)" style="background:transparent; border:none; color:inherit; width: 100%;"></td>
            <td><input type="number" step="0.01" value="${std.amountRatio}" oninput="updateStandard(${index}, 'amountRatio', this.value)" style="width: 80px;"></td>
            <td><input type="number" step="100" value="${std.analyteArea}" oninput="updateStandard(${index}, 'analyteArea', this.value)" style="width: 100px;"></td>
            <td><input type="number" step="100" value="${std.isArea}" oninput="updateStandard(${index}, 'isArea', this.value)" style="width: 100px;"></td>
            <td id="std-ratio-${index}" style="font-family: monospace;">${ratio.toFixed(4)}</td>
            <td><button onclick="removeStandard(${index})" style="background:transparent; border:none; color:#ff6b6b; cursor:pointer; font-weight:bold; font-size: 1rem;" title="Remove Row">✕</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function addStandardRow() {
    calibrationStandards.push({
        id: `Std_New_${calibrationStandards.length + 1}`,
        amountRatio: 0.5,
        analyteArea: 250000,
        isArea: 500000
    });
    renderCalculator();
}

function removeStandard(index) {
    if (calibrationStandards.length <= 2) {
        alert("A minimum of 2 calibration points is required for regression calculation.");
        return;
    }
    calibrationStandards.splice(index, 1);
    renderCalculator();
}

function updateStandard(index, field, value) {
    if (field === 'id') {
        calibrationStandards[index][field] = value;
    } else {
        calibrationStandards[index][field] = parseFloat(value) || 0;
    }

    const ratio = calibrationStandards[index].isArea > 0 ? (calibrationStandards[index].analyteArea / calibrationStandards[index].isArea) : 0;
    const ratioCell = document.getElementById(`std-ratio-${index}`);
    if (ratioCell) ratioCell.innerText = ratio.toFixed(4);

    const regression = calculateLinearRegression();
    renderChart(regression);
    renderUnknownsTable(regression);
}

function getAveragedStandards() {
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

function calculateLinearRegression() {
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

    const eqEl = document.getElementById('regEquation');
    const r2El = document.getElementById('regR2');
    
    if (eqEl) eqEl.innerText = `y = ${slope.toFixed(5)}x + ${intercept.toFixed(4)}`;
    if (r2El) r2El.innerText = isNaN(r2) ? "0.0000" : r2.toFixed(4);

    return { slope, intercept, r2, averagedPoints };
}

const errorBarPlugin = {
    id: 'errorBars',
    afterDatasetsDraw(chart) {
        const { ctx, scales: { y } } = chart;
        const dataset = chart.data.datasets[0];
        const meta = chart.getDatasetMeta(0);

        if (meta.hidden) return;

        ctx.save();
        ctx.strokeStyle = '#F4F6F8';
        ctx.lineWidth = 1.5;

        meta.data.forEach((element, index) => {
            const dataPoint = dataset.data[index];
            if (dataPoint && dataPoint.errorVal !== undefined && dataPoint.errorVal > 0) {
                const xPos = element.x;
                const yTop = y.getPixelForValue(dataPoint.y + dataPoint.errorVal);
                const yBottom = y.getPixelForValue(dataPoint.y - dataPoint.errorVal);

                ctx.beginPath();
                ctx.moveTo(xPos, yTop);
                ctx.lineTo(xPos, yBottom);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(xPos - 4, yTop);
                ctx.lineTo(xPos + 4, yTop);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(xPos - 4, yBottom);
                ctx.lineTo(xPos + 4, yBottom);
                ctx.stroke();
            }
        });
        ctx.restore();
    }
};

function renderChart(regression) {
    const ctx = document.getElementById('calibrationChart');
    if (!ctx) return;

    const errorTypeSelect = document.getElementById('errorBarType');
    const errorType = errorTypeSelect ? errorTypeSelect.value : 'sd';

    const scatterData = regression.averagedPoints.map(pt => ({
        x: pt.amountRatio,
        y: pt.avgRatio,
        errorVal: errorType === 'sem' ? pt.sem : pt.sd
    }));

    const minX = regression.averagedPoints.length > 0 ? Math.min(...regression.averagedPoints.map(p => p.amountRatio)) : 0;
    const maxX = regression.averagedPoints.length > 0 ? Math.max(...regression.averagedPoints.map(p => p.amountRatio)) : 1;
    
    const lineData = [
        { x: minX, y: regression.slope * minX + regression.intercept },
        { x: maxX, y: regression.slope * maxX + regression.intercept }
    ];

    if (calibrationChartInstance) {
        calibrationChartInstance.destroy();
    }

    const labelName = errorType === 'sem' ? 'Averaged Standards (± 1 SEM)' : 'Averaged Standards (± 1 SD)';

    calibrationChartInstance = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: labelName,
                    data: scatterData,
                    backgroundColor: '#00B027',
                    pointRadius: 6
                },
                {
                    label: 'Regression Line',
                    data: lineData,
                    type: 'line',
                    borderColor: '#007500',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: { display: true, text: 'Amount Ratio n_ref / n_IS', color: '#A0AAB2' },
                    grid: { color: '#33383F' },
                    ticks: { color: '#A0AAB2' }
                },
                y: {
                    title: { display: true, text: 'Averaged Peak Area Ratio (I_x / I_y)', color: '#A0AAB2' },
                    grid: { color: '#33383F' },
                    ticks: { color: '#A0AAB2' }
                }
            },
            plugins: {
                legend: { labels: { color: '#F4F6F8' } }
            }
        },
        plugins: [errorBarPlugin]
    });
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        parseUnknownTextData(e.target.result, file.name);
    };
    reader.readAsText(file);
}

function parseUnknownTextData(text, filename) {
    const lines = text.split(/\r\n|\n/);
    const newDataset = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('#') || line.toLowerCase().includes('sample')) continue;

        const parts = line.split(/[\t,\s]+/);
        if (parts.length >= 3) {
            const id = parts[0];
            const analyteArea = parseFloat(parts[1]);
            const isArea = parseFloat(parts[2]);

            if (!isNaN(analyteArea) && !isNaN(isArea)) {
                newDataset.push({ id, analyteArea, isArea });
            }
        }
    }

    const statusEl = document.getElementById('importStatus');
    if (newDataset.length > 0) {
        unknownDataset = newDataset;
        if (statusEl) statusEl.innerText = `Loaded ${newDataset.length} unknown samples from "${filename}".`;
    } else {
        if (statusEl) statusEl.innerText = `Error parsing "${filename}". Check format.`;
    }

    renderCalculator();
}

function renderUnknownsTable(regression) {
    const tbody = document.getElementById('resultsBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    unknownDataset.forEach(row => {
        const ratio = row.isArea > 0 ? (row.analyteArea / row.isArea) : 0;
        const amountRatioResult = regression.slope !== 0 ? (ratio - regression.intercept) / regression.slope : 0;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.id}</td>
            <td>${row.analyteArea.toLocaleString()}</td>
            <td>${row.isArea.toLocaleString()}</td>
            <td>${ratio.toFixed(4)}</td>
            <td style="font-weight: bold; color: var(--accent-green-bright);">${amountRatioResult > 0 ? amountRatioResult.toFixed(4) : 'Below LOD'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Peptide Sequence to SMILES Converter ---
function setPeptidePreset(seq) {
    const input = document.getElementById('peptideInput');
    if (input) {
        input.value = seq;
        convertPeptideToSmiles();
    }
}

function convertPeptideToSmiles() {
    const pepInput = document.getElementById('peptideInput');
    const smilesInput = document.getElementById('smilesInput');
    const errBox = document.getElementById('smilesError');
    if (!pepInput || !smilesInput) return;

    let seq = pepInput.value.trim().toUpperCase().replace(/[^A-Z]/g, '');
    if (!seq) {
        if (errBox) errBox.style.display = 'none';
        return;
    }

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
            case 'P': sideChain = "CCC"; break;
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
    peptideSmiles = peptideSmiles.substring(0, peptideSmiles.length - 1) + "C(=O)O";

    smilesInput.value = peptideSmiles;
    convertSmilesToMass();
}

// --- SMILES Mass Converter & SVG Structure Rendering Engine ---
function setSmilesPreset(smilesStr) {
    const input = document.getElementById('smilesInput');
    if (input) {
        input.value = smilesStr;
        convertSmilesToMass();
    }
}

function convertSmilesToMass() {
    const input = document.getElementById('smilesInput');
    const errBox = document.getElementById('smilesError');
    if (!input) return;

    const smiles = input.value.trim();
    if (!smiles) {
        if (errBox) errBox.style.display = 'none';
        updateSmilesDisplay({}, 0, 0, 0, "");
        return;
    }

    try {
        const atomCounts = parseSmilesComposition(smiles);
        let monoMass = 0;
        let avgMass = 0;
        
        for (let elem in atomCounts) {
            const count = atomCounts[elem];
            const info = ELEMENT_DATA[elem] || ELEMENT_DATA['C'];
            monoMass += info.mono * count;
            avgMass += info.avg * count;
        }

        const protonMass = ELEMENT_DATA['H'].mono;
        const mPlusH = monoMass + protonMass;
        const formulaStr = formatFormulaHTML(atomCounts);

        if (errBox) errBox.style.display = 'none';
        updateSmilesDisplay(atomCounts, monoMass, avgMass, mPlusH, formulaStr);
        renderChemicalStructure(smiles);
    } catch (e) {
        if (errBox) {
            errBox.innerText = `Parsing Error: ${e.message}`;
            errBox.style.display = 'block';
        }
    }
}

function renderChemicalStructure(smiles) {
    const svgElement = document.getElementById('smilesSvg');
    if (!svgElement) return;

    svgElement.innerHTML = '';

    if (typeof SmilesDrawer === 'undefined') {
        svgElement.innerHTML = `<text x="50%" y="50%" fill="#ff6b6b" font-size="12" font-family="sans-serif" text-anchor="middle">SmilesDrawer library not loaded</text>`;
        return;
    }

    let options = {
        width: 350,
        height: 220,
        theme: 'dark',
        bondThickness: 2,
        bondLength: 25,
        noPadding: false
    };

    try {
        SmilesDrawer.parse(smiles, function(tree) {
            let drawer = new SmilesDrawer.SvgDrawer(options);
            drawer.draw(tree, svgElement, 'dark');
        }, function(err) {
            renderPeptideChainGraphic(svgElement, smiles);
        });
    } catch (e) {
        renderPeptideChainGraphic(svgElement, smiles);
    }
}

function renderPeptideChainGraphic(svgElement, smilesString) {
    const pepInput = document.getElementById('peptideInput');
    const seq = pepInput ? pepInput.value.trim().toUpperCase() : "PEPTIDE";

    svgElement.innerHTML = `
        <rect width="350" height="220" fill="#0f172a" rx="6" />
        <text x="50%" y="70" fill="#10b981" font-size="16" font-weight="bold" font-family="monospace" text-anchor="middle">PEPTIDE SEQUENCE</text>
        <text x="50%" y="115" fill="#f8fafc" font-size="22" font-weight="bold" font-family="monospace" text-anchor="middle">${seq}</text>
        <text x="50%" y="155" fill="#94a3b8" font-size="11" font-family="sans-serif" text-anchor="middle">Mass & Formula Successfully Computed</text>
        <text x="50%" y="175" fill="#64748b" font-size="10" font-family="monospace" text-anchor="middle">${smilesString.substring(0, 38)}...</text>
    `;
}

function parseSmilesComposition(smiles) {
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

function formatFormulaHTML(counts) {
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

function updateSmilesDisplay(counts, mono, avg, mPlusH, formulaHtml) {
    const monoEl = document.getElementById('smilesMonoMass');
    const avgEl = document.getElementById('smilesAvgMass');
    const mHEl = document.getElementById('smilesMPlusH');
    const formEl = document.getElementById('smilesFormula');

    if (monoEl) monoEl.innerText = mono > 0 ? mono.toFixed(4) : "0.0000";
    if (avgEl) avgEl.innerText = avg > 0 ? avg.toFixed(3) : "0.000";
    if (mHEl) mHEl.innerText = mPlusH > 0 ? mPlusH.toFixed(4) : "0.0000";
    if (formEl) formEl.innerHTML = formulaHtml || "—";
}