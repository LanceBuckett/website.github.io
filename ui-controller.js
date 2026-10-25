import { 
    calibrationStandards, 
    unknownDataset, 
    ELEMENT_DATA, 
    calculateLinearRegression, 
    parseCalibrationTextData,
    parseSmilesComposition, 
    formatFormulaHTML, 
    peptideToSmilesString 
} from './chemistry-engine.js';

let calibrationChartInstance = null;
let currentViewMode = '2d';
let viewer3d = null;

// --- Safe DOM Content Loaded Initialization ---
window.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('standardsBody')) {
        renderCalculator();
    }
    if (document.getElementById('peptideInput')) {
        window.convertPeptideToSmiles();
    } else if (document.getElementById('smilesInput')) {
        window.convertSmilesToMass();
    }
});

window.switchPage = function(pageId) {
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
        window.convertPeptideToSmiles();
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
            <td><input type="text" value="${std.id}" onchange="window.updateStandard(${index}, 'id', this.value)" style="background:transparent; border:none; color:inherit; width: 100%;"></td>
            <td><input type="number" step="0.01" value="${std.amountRatio}" oninput="window.updateStandard(${index}, 'amountRatio', this.value)" style="width: 80px;"></td>
            <td><input type="number" step="100" value="${std.analyteArea}" oninput="window.updateStandard(${index}, 'analyteArea', this.value)" style="width: 100px;"></td>
            <td><input type="number" step="100" value="${std.isArea}" oninput="window.updateStandard(${index}, 'isArea', this.value)" style="width: 100px;"></td>
            <td id="std-ratio-${index}" style="font-family: monospace;">${ratio.toFixed(4)}</td>
            <td><button onclick="window.removeStandard(${index})" style="background:transparent; border:none; color:#ff6b6b; cursor:pointer; font-weight:bold; font-size: 1rem;" title="Remove Row">✕</button></td>
        `;
        tbody.appendChild(tr);
    });
}

window.addStandardRow = function() {
    calibrationStandards.push({
        id: `Std_New_${calibrationStandards.length + 1}`,
        amountRatio: 0.5,
        analyteArea: 250000,
        isArea: 500000
    });
    renderCalculator();
}

window.removeStandard = function(index) {
    if (calibrationStandards.length <= 2) {
        alert("A minimum of 2 calibration points is required for regression calculation.");
        return;
    }
    calibrationStandards.splice(index, 1);
    renderCalculator();
}

window.updateStandard = function(index, field, value) {
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

    const eqEl = document.getElementById('regEquation');
    const r2El = document.getElementById('regR2');
    if (eqEl) eqEl.innerText = `y = ${regression.slope.toFixed(5)}x + ${regression.intercept.toFixed(4)}`;
    if (r2El) r2El.innerText = isNaN(regression.r2) ? "0.0000" : regression.r2.toFixed(4);

    calibrationChartInstance = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                { label: labelName, data: scatterData, backgroundColor: '#00B027', pointRadius: 6 },
                { label: 'Regression Line', data: lineData, type: 'line', borderColor: '#007500', borderWidth: 2, pointRadius: 0, fill: false }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: 'Amount Ratio n_ref / n_IS', color: '#A0AAB2' }, grid: { color: '#33383F' }, ticks: { color: '#A0AAB2' } },
                y: { title: { display: true, text: 'Averaged Peak Area Ratio (I_x / I_y)', color: '#A0AAB2' }, grid: { color: '#33383F' }, ticks: { color: '#A0AAB2' } }
            },
            plugins: { legend: { labels: { color: '#F4F6F8' } } }
        },
        plugins: [errorBarPlugin]
    });
}

window.handleCalibrationFileUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const result = parseCalibrationTextData(e.target.result);
        const statusEl = document.getElementById('calibImportStatus');
        
        if (result.success) {
            if (statusEl) statusEl.innerText = `Loaded ${result.count} calibration points from "${file.name}".`;
            renderCalculator();
        } else {
            if (statusEl) statusEl.innerText = `Error parsing "${file.name}". Check format.`;
        }
    };
    reader.readAsText(file);
}

window.handleFileUpload = function(event) {
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
        unknownDataset.length = 0;
        Array.prototype.push.apply(unknownDataset, newDataset);
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

window.setPeptidePreset = function(seq) {
    const input = document.getElementById('peptideInput');
    if (input) {
        input.value = seq;
        window.convertPeptideToSmiles();
    }
}

window.convertPeptideToSmiles = function() {
    const pepInput = document.getElementById('peptideInput');
    const smilesInput = document.getElementById('smilesInput');
    const errBox = document.getElementById('smilesError');
    if (!pepInput || !smilesInput) return;

    let seq = pepInput.value.trim();
    let peptideSmiles = peptideToSmilesString(seq);

    if (!peptideSmiles) {
        if (errBox) errBox.style.display = 'none';
        return;
    }

    smilesInput.value = peptideSmiles;
    window.convertSmilesToMass();
}

window.setSmilesPreset = function(smilesStr) {
    const input = document.getElementById('smilesInput');
    if (input) {
        input.value = smilesStr;
        window.convertSmilesToMass();
    }
}

window.convertSmilesToMass = function() {
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
        
        if (currentViewMode === '2d') {
            renderChemicalStructure(smiles);
        } else {
            render3DStructure(smiles);
        }
    } catch (e) {
        if (errBox) {
            errBox.innerText = `Parsing Error: ${e.message}`;
            errBox.style.display = 'block';
        }
    }
}

window.setStructureView = function(mode) {
    currentViewMode = mode;
    const svgEl = document.getElementById('smilesSvg');
    const container3d = document.getElementById('smiles3dContainer');
    const btn2d = document.getElementById('viewBtn2D');
    const btn3d = document.getElementById('viewBtn3D');

    if (mode === '2d') {
        if(svgEl) svgEl.style.display = 'block';
        if(container3d) container3d.style.display = 'none';
        if(btn2d) btn2d.className = 'btn';
        if(btn3d) btn3d.className = 'btn btn-secondary';
        const smiles = document.getElementById('smilesInput').value.trim();
        if(smiles) renderChemicalStructure(smiles);
    } else {
        if(svgEl) svgEl.style.display = 'none';
        if(container3d) container3d.style.display = 'block';
        if(btn2d) btn2d.className = 'btn btn-secondary';
        if(btn3d) btn3d.className = 'btn';
        const smiles = document.getElementById('smilesInput').value.trim();
        if(smiles) render3DStructure(smiles);
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

    let options = { width: 350, height: 220, theme: 'dark', bondThickness: 2, bondLength: 25, noPadding: false };

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

function render3DStructure(smiles) {
    const container = document.getElementById('smiles3dContainer');
    if (!container) return;

    if (!viewer3d) {
        viewer3d = $3Dmol.createViewer(container, {
            backgroundColor: '#0f172a'
        });
    }

    viewer3d.clear();

    const encodedSmiles = encodeURIComponent(smiles);
    const cactusUrl = `https://cactus.nci.nih.gov/chemical/structure/${encodedSmiles}/file?format=pdb&get3d=true`;

    fetch(cactusUrl)
        .then(response => {
            if (!response.ok) throw new Error('3D conformer generation failed');
            return response.text();
        })
        .then(pdbData => {
            viewer3d.addModel(pdbData, "pdb");
            viewer3d.setStyle({}, { stick: { radius: 0.15 }, sphere: { scale: 0.3 } });
            viewer3d.zoomTo();
            viewer3d.render();
        })
        .catch(err => {
            container.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; height:100%; color:#ff6b6b; font-size:0.8rem; text-align:center; padding:1rem;">3D conformer generation failed for this structure. Use 2D view.</div>`;
        });
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

window.handleFormSubmit = function(event) {
    event.preventDefault();
    const successBox = document.getElementById('form-success');
    if (successBox) {
        successBox.style.display = 'block';
    }
    event.target.reset();
}
