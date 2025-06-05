class Individual {
  constructor(genes, seed = null) {
    this.genes = genes || this.randomGenes();
    
    // ✅ 加入隨機種子機制
    this.seed = seed !== null
  ? seed
  : (genes && genes.seed !== undefined ? genes.seed : Math.floor(random(100000)));

this.genes.seed = this.seed; // ✅ 記錄 seed 到 genes

    
    this.organicVertices = [];

    const sides = 3 + Math.floor(this.genes.shapeType / 8);
    const base = this.genes.shapeType % 8;
    this.shapeBase = base;
    this.shapeSides = sides;

    if (base === 6) {
      this.generateOrganicPoints(sides);
    }
  }

  generateOrganicPoints(sides) {
    // ✅ 使用固定種子後，這邊每次會一致
    this.organicVertices = [];
    for (let i = 0; i < sides; i++) {
      let angle = TWO_PI / sides * i;
      let r = 0.7 + random(0.6);
      this.organicVertices.push({ angle, r });
    }
  }

  randomGenes() {
    return {
      colorIndex: int(random(256)),
      shapeType: int(random(256)),
      layoutType: int(random(256))
    };
  }

  getShapeSize(spacingX, spacingY, nx, ny) {
    let rawSize = 18 + noise(nx * 1.5, ny * 1.5) * 30;
    let maxSize = min(spacingX, spacingY) * 0.6;
    return constrain(rawSize, 10, maxSize);
  }

  display(x, y, w, h, pg = null) {
    let ctx = pg || window;

    // ✅ 固定圖像結果，防止跳動
    randomSeed(this.seed);
    noiseSeed(this.seed);

    ctx.push();
    ctx.drawingContext.save();
    ctx.drawingContext.beginPath();
    ctx.drawingContext.rect(x, y, w, h);
    ctx.drawingContext.clip();
    ctx.translate(x, y);
    let scaleFactor = w / 300;
    ctx.scale(scaleFactor, scaleFactor);

    let colorIndex = overrideColorIndex !== null ? overrideColorIndex : this.genes.colorIndex;
    let shapeType = overrideShapeType !== null ? overrideShapeType : this.genes.shapeType;
    let layoutType = overrideLayoutType !== null ? overrideLayoutType : this.genes.layoutType;

    let c = colorHSBPalette[colorIndex];
    let hh = window.overrideHue !== undefined ? window.overrideHue : hue(c);
    let ss = window.overrideSaturation !== undefined ? window.overrideSaturation : 100;
    let bb = window.overrideBrightness !== undefined ? window.overrideBrightness : 100;

    colorMode(HSB, 360, 100, 100);
    ctx.fill(color(hh, ss, bb));
    colorMode(RGB);
    ctx.noStroke();

    this.drawAccordingToLayout(300, 300, layoutType, shapeType, ctx);

    ctx.drawingContext.restore();
    ctx.pop();
  }

 drawPerlinLayout(w, h, layoutType, shapeType, ctx) {
  // === 將 layoutType 拆為三層分類變數 ===
  let layoutGroup = Math.floor(layoutType / 64);            // 0~3: Grid, Radial, DriftGrid, Minimal
  let perturbationType = Math.floor((layoutType % 64) / 16); // 0~3: None, Weak, Fractal, AngleFlow
  let densityIndex = layoutType % 16;                       // 0~15: 控制 cols x rows

  // === 密度控制（2~5）===
  let cols = 2 + Math.floor(densityIndex / 4);
  let rows = 2 + (densityIndex % 4);
  let spacingX = w / (cols + 1);
  let spacingY = h / (rows + 1);

  let offsetFactor = 20 + perturbationType * 10;

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let x = (i + 1) * spacingX;
      let y = (j + 1) * spacingY;
      let nx = i * 0.3;
      let ny = j * 0.3;

      // === 擾動控制 ===
      let offsetX = 0;
      let offsetY = 0;

      if (perturbationType === 1) {
        offsetX = map(noise(nx, ny), 0, 1, -offsetFactor, offsetFactor);
        offsetY = map(noise(nx + 100, ny + 100), 0, 1, -offsetFactor, offsetFactor);
      } else if (perturbationType === 2) {
        let f = (x, y) => {
          let total = 0, amp = 1, freq = 1;
          for (let k = 0; k < 3; k++) {
            total += noise(x * freq, y * freq) * amp;
            amp *= 0.5;
            freq *= 2;
          }
          return total;
        };
        offsetX = map(f(nx, ny), 0, 1, -offsetFactor * 1.2, offsetFactor * 1.2);
        offsetY = map(f(nx + 50, ny + 50), 0, 1, -offsetFactor * 1.2, offsetFactor * 1.2);
      } else if (perturbationType === 3) {
        let angle = noise(nx, ny) * TWO_PI;
        offsetX = cos(angle) * offsetFactor;
        offsetY = sin(angle) * offsetFactor;
      }

      // === 構圖風格 ===
      if (layoutGroup === 0) {
        // Grid 排列（基本正格）
        this.drawShapeWithType(x + offsetX, y + offsetY, this.getShapeSize(spacingX, spacingY, nx, ny), shapeType, ctx);

      } else if (layoutGroup === 1) {
        // Radial 排列（類向心排列）
        let cx = w / 2;
        let cy = h / 2;
        let angle = TWO_PI * (i * rows + j) / (cols * rows);
        let radius = 20 + (i + j) * 10;
        let rx = cx + cos(angle) * radius + offsetX;
        let ry = cy + sin(angle) * radius + offsetY;
        this.drawShapeWithType(x + offsetX, y + offsetY, this.getShapeSize(spacingX, spacingY, nx, ny), shapeType, ctx);

      } else if (layoutGroup === 2) {
        // DriftGrid（像波浪漂浮格子）
        let driftX = x + sin(y * 0.05 + layoutType) * 10 + offsetX;
        let driftY = y + cos(x * 0.05 + layoutType) * 10 + offsetY;
       this.drawShapeWithType(x + offsetX, y + offsetY, this.getShapeSize(spacingX, spacingY, nx, ny), shapeType, ctx);

      } else if (layoutGroup === 3) {
        // Minimal（只畫中點或角點）
        if ((i === Math.floor(cols / 2) && j === Math.floor(rows / 2)) || (i === 0 && j === 0) || (i === cols - 1 && j === rows - 1)) {
          this.drawShapeWithType(x + offsetX, y + offsetY, this.getShapeSize(spacingX, spacingY, nx, ny), shapeType, ctx);

        }
      }
    }
  }
}

  drawPerlinRadial(w, h, layoutType, shapeType, ctx) {
  let count = 5 + (layoutType % 12);
  let cx = w / 2;
  let cy = h / 2;

  // 先定義最大半徑（不得超過畫布一半減去最大 shape 尺寸）
  let maxRadius = Math.min(w, h) / 2 - 20;
  let baseRadius = 20 + (layoutType % 5) * 10;
  baseRadius = Math.min(baseRadius, maxRadius * 0.8); // 防止擴大過多
  let angleOffset = noise(layoutType * 0.1) * TWO_PI;

  for (let i = 0; i < count; i++) {
    let angle = angleOffset + TWO_PI * i / count;
    let radiusOffset = noise(i * 0.1, layoutType * 0.1) * 0.3; // 限制幅度
    let radius = baseRadius + radiusOffset * maxRadius * 0.5;
    radius = constrain(radius, 10, maxRadius);

    let x = cx + cos(angle) * radius;
    let y = cy + sin(angle) * radius;

    let rawSize = 15 + noise(i * 0.2, layoutType * 0.2) * 30;
    let maxSize = maxRadius * 0.3;
    let size = constrain(rawSize, 10, maxSize);

this.drawShapeWithType(x, y, size, shapeType, ctx);
  }
}
  
  drawClusterRing(w, h, layoutType, shapeType, ctx) {
  let cx = w / 2;
  let cy = h / 2;
  let layers = 2 + ((layoutType - 192) % 4); // 2~5 圈
let pointsPerLayer = 6 + Math.floor((layoutType - 192) / 4); // 6~13 點數


  for (let l = 1; l <= layers; l++) {
    let radius = (min(w, h) / 2) * (l / (layers + 1)) * 0.9;
    for (let i = 0; i < pointsPerLayer; i++) {
      let angle = TWO_PI * i / pointsPerLayer + noise(l, i) * 0.3;
      let x = cx + cos(angle) * radius;
      let y = cy + sin(angle) * radius;
      let size = 10 + noise(x * 0.01, y * 0.01) * 20;
      this.drawShapeWithType(x, y, size, shapeType, ctx);
    }
  }
}
  
drawFreeChaos(w, h, layoutType, shapeType, ctx) {
  let count = 10 + (layoutType % 20); // 散佈圖數量
  for (let i = 0; i < count; i++) {
    let nx = random(1000);
    let ny = random(1000);
    let x = noise(nx) * w + sin(nx * 10) * 10;
    let y = noise(ny) * h + cos(ny * 10) * 10;
    let size = 10 + noise(nx, ny) * 25;
this.drawShapeWithType(x, y, size, shapeType, ctx);
  }
}

  drawAccordingToLayout(w, h, layoutType, shapeType, ctx) {
  if (layoutType < 128) {
    this.drawPerlinLayout(w, h, layoutType, shapeType, ctx);
  } else if (layoutType < 192) {
    this.drawPerlinRadial(w, h, layoutType, shapeType, ctx);
  } else if (layoutType < 224) {
    this.drawClusterRing(w, h, layoutType, shapeType, ctx);
  } else {
    this.drawFreeChaos(w, h, layoutType, shapeType, ctx);
  }
}
  
  drawShapeWithType(x, y, size, t, ctx) {
  const base = t % 8;
  const sides = 3 + Math.floor(t / 8);
  ctx.push();
  switch (base) {
    case 0: ctx.ellipse(x, y, size); break;
    case 1: ctx.ellipse(x, y, size * 1.2, size); break;
    case 2: ctx.triangle(x, y - size / 2, x - size / 2, y + size / 2, x + size / 2, y + size / 2); break;
    case 3: ctx.rect(x - size / 2, y - size / 2, size, size); break;
    case 4: this.drawStar(x, y, size / 2, sides, ctx); break;
    case 5: this.drawPolygon(x, y, size / 2, sides, ctx); break;
    case 6: this.drawOrganic(x, y, size / 2, ctx); break;
    case 7: this.drawFlower(x, y, size / 2, sides, ctx); break;
  }
  ctx.pop();
}

drawPolygon(x, y, radius, n, ctx = window) {
  ctx.beginShape();
  for (let i = 0; i < n; i++) {
    let angle = TWO_PI / n * i;
    ctx.vertex(x + cos(angle) * radius, y + sin(angle) * radius);
  }
  ctx.endShape(CLOSE);
}

  drawStar(x, y, radius, points, ctx = window) {
  ctx.beginShape();
  let angle = TWO_PI / points;
  let halfAngle = angle / 2.0;

  for (let a = 0; a < TWO_PI; a += angle) {
    let sx = x + cos(a) * radius;
    let sy = y + sin(a) * radius;
    ctx.vertex(sx, sy);
    sx = x + cos(a + halfAngle) * radius / 2;
    sy = y + sin(a + halfAngle) * radius / 2;
    ctx.vertex(sx, sy);
  }

  ctx.endShape(CLOSE);
}

 drawOrganic(x, y, radius, ctx = window) {
  if (!this.organicVertices || this.organicVertices.length === 0) {
    this.generateOrganicPoints(5); // 預設生成 5 邊點
  }

  ctx.beginShape();
  for (let pt of this.organicVertices) {
    let px = x + cos(pt.angle) * radius * pt.r;
    let py = y + sin(pt.angle) * radius * pt.r;
    ctx.curveVertex(px, py);
  }
  ctx.endShape(CLOSE);
}

drawFlower(x, y, radius, petals, ctx = window) {
  ctx.beginShape();
  for (let a = 0; a < TWO_PI; a += 0.1) {
    let r = radius * sin(petals * a);
    let px = x + cos(a) * r;
    let py = y + sin(a) * r;
    ctx.vertex(px, py);
  }
  ctx.endShape(CLOSE);
}

}

class Population {
constructor(size) {
  this.individuals = [];
  this.historySet = new Set();

  let maxRetry = 100; // 最多嘗試 100 次避免卡住

  while (this.individuals.length < size && maxRetry > 0) {
    let candidate = new Individual();

    let tooSimilar = this.individuals.some(existing => {
      // 色彩差異（色相環繞）
      let dc = Math.abs(candidate.genes.colorIndex - existing.genes.colorIndex);
      if (dc > 128) dc = 256 - dc;

      // 形狀差異（base type）
      let base1 = candidate.genes.shapeType % 8;
      let base2 = existing.genes.shapeType % 8;
      let ds = Math.abs(base1 - base2);

      // 構圖差異（layout group 分類）
      let layoutGroup1 = Math.floor(candidate.genes.layoutType / 64);
      let layoutGroup2 = Math.floor(existing.genes.layoutType / 64);
      let dl = Math.abs(layoutGroup1 - layoutGroup2);

      // ✅ 若三者都太接近，則視為「太類似」
      return dc < 40 && ds === 0 && dl === 0;
    });

    if (!tooSimilar) {
      this.individuals.push(candidate);
    } else {
      maxRetry--;
    }
  }

  // 保險機制：重試過多時強制補足
  while (this.individuals.length < size) {
    this.individuals.push(new Individual());
  }
}


evolve(selectedIndividual, preserveIndex = -1) {
  let newGeneration = [];
  let generationSet = new Set();

  for (let i = 0; i < 9; i++) {
    if (i === preserveIndex) {
      newGeneration.push(selectedIndividual);
      continue;
    }

    let retry = 0;
    let maxRetry = 50;
    let newInd;

    while (retry < maxRetry) {
      let partner = random(this.individuals);
      let newGenes = crossover(selectedIndividual.genes, partner.genes);

      if (!newGenes || typeof newGenes !== 'object') {
        newGenes = {
          colorIndex: int(random(256)),
          shapeType: int(random(256)),
          layoutType: int(random(256))
        };
      }

      newGenes = mutate(newGenes);
      let geneKey = `${newGenes.colorIndex}-${newGenes.shapeType}-${newGenes.layoutType}`; // ❌ 不含 seed


      newInd = new Individual(newGenes);

      // ✅ 多樣性檢查：與已生成圖比對是否太相似
      let tooSimilar = newGeneration.some(existing => {
        let dc = Math.abs(newGenes.colorIndex - existing.genes.colorIndex);
        if (dc > 128) dc = 256 - dc; // 色相環繞差異

        let ds = Math.abs((newGenes.shapeType % 8) - (existing.genes.shapeType % 8));
        let dl = Math.abs(Math.floor(newGenes.layoutType / 64) - Math.floor(existing.genes.layoutType / 64));

        return dc < 40 && ds === 0 && dl === 0;
      });

      if (!this.historySet.has(geneKey) && !generationSet.has(geneKey) && !tooSimilar) {
        generationSet.add(geneKey);
        this.historySet.add(geneKey);

        if (newGenes.shapeType % 8 === 6) {
          let sides = 3 + Math.floor(newGenes.shapeType / 8);
          newInd.generateOrganicPoints(sides);
        }

        break;
      } else {
        retry++;
      }
    }

    // 若重試超過上限，仍強制塞入目前版本（避免卡住）
    newGeneration.push(newInd || new Individual());
  }

  if (generation % 5 === 0 && preserveIndex !== 0) {
    newGeneration[0] = new Individual(); // 強制注入新血
  }

  this.individuals = newGeneration;
  this.lastSelected = selectedIndividual;
}



}


if (typeof Population === 'undefined') {
  throw new Error("❗請先載入 sketch.js，Population 尚未定義");
}

const colorPalette = [...Array(256)].map(() =>
  "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")
);
let colorHSBPalette = [];
function createColorPaletteHSB() {
  colorMode(HSB, 360, 100, 100);
  for (let i = 0; i < 256; i++) {
    let h = int(random(360));
    let s = int(random(60, 100));
    let b = int(random(60, 100));
    colorHSBPalette[i] = color(h, s, b);
  }
  colorMode(RGB);
}
let saturationSliders = [], brightnessSliders = [], hueSliders = [];
let generation = 0;
let overrideColorIndex = null;
let overrideShapeType = null;
let overrideLayoutType = null;
let redrawTimeout = null;
let inSecondStage = false;
let maxGenerations = 100;
let population;
let finishButton;
let selectedIndividual = null;
let restartButton;
let nextButton;
let historyStack = [];
let selectedGenesList = [];
let adjustmentSets = [];
let previewGraphics = [];
let secondStageButton;
let completeButton;
let snapshotCaptured = false;
let inFinalStage = false; 

function makeAdjustmentSet(genes) {
  return {
    hue: hue(colorHSBPalette[genes.colorIndex]),
    saturation: 100,
    brightness: 100,
    shape: genes.shapeType,
    layout: genes.layoutType
  };
}

function resetGlobalState() {
  overrideColorIndex = null;
  overrideShapeType = null;
  overrideLayoutType = null;
  window.overrideHue = undefined;
  window.overrideSaturation = undefined;
  window.overrideBrightness = undefined;
  snapshotCaptured = false;
}


function setup() {

  createColorPaletteHSB(); 
  createCanvas(750, 800);
  population = new Population(9);
  setupUI();
  noLoop();
  redraw();

  finishButton = createButton("finish");
  finishButton.position(20, height + 40);
  finishButton.mousePressed(endExperiment);
}

// ✅ 顯示完整參數格式（索引 + HSB + 形狀 + 構圖）
function startSecondStage() {
  if (!window.selectedIndividual) {
    alert("⚠ 請先選擇一張圖後再進入第二階段！");
    return;
  }

  inSecondStage = true;
  clear();
  redraw();
  noLoop();

  previewGraphics = [
    createGraphics(200, 200),
    createGraphics(200, 200),
    createGraphics(200, 200)
  ];

  const baseGenes = window.selectedIndividual.genes;
  selectedGenesList = [baseGenes, baseGenes, baseGenes];

  adjustmentSets = [0, 1, 2].map(() => ({
    hue: hue(colorHSBPalette[baseGenes.colorIndex]),
    saturation: 100,
    brightness: 100,
    shape: baseGenes.shapeType,
    layout: baseGenes.layoutType
  }));

  if (!window.adjustmentUISetupDone) {
    for (let i = 0; i < 3; i++) {
      createAdjustmentSliders(i, 100 + i * 220, height + 100);
    }

    completeButton = createButton("✅ 完成所有調整")
      .position(width / 2 - 43, height -100)
      .mousePressed(() => {
        if (completeButton) {
          completeButton.remove();
          completeButton = null;

          if (restartButton) restartButton.hide();
          if (nextButton) nextButton.hide();
          if (secondStageButton) secondStageButton.hide();

          if (window.createdSliders) window.createdSliders.forEach(slider => slider.hide());
          if (window.resetButtons) window.resetButtons.forEach(btn => btn.hide());
          if (window.createdLabels) window.createdLabels.forEach(label => label.remove());

          let results = [];
          for (let i = 0; i < 3; i++) {
            results.push({
              originalGenes: selectedGenesList[i],
              adjusted: adjustmentSets[i]
            });
          }

          let payload = {
            userInfo: window.userInfo || { age: '', gender: '', nationality: '' },
            generationUsed: generation + 1,
            firstChoice: window.selectedIndividual.genes,
            adjustments: results
          };

          fetch('https://script.google.com/macros/s/AKfycbwVAEa6KjptdwpgaxVVjjSlPXsogzfoZdxBH4M0cEj5goRX6fw5jtNUGdGSC9J481jZ/exec', {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          clear();
          background(240);
          textAlign(CENTER);
          textSize(18);
          fill(0);
          text(`你總共使用了 ${generation + 1} / ${maxGenerations} 次生成`, width / 2, 40);
          text(`以下是您在第一階段選擇的結果：`, width / 2, 70);

          let backupColor = overrideColorIndex;
          let backupShape = overrideShapeType;
          let backupLayout = overrideLayoutType;

          overrideColorIndex = null;
          overrideShapeType = null;
          overrideLayoutType = null;

          if (window.selectedSnapshot) {
            image(window.selectedSnapshot, width / 2 - 75, 100, 150, 150);
          } else {
            let pg1 = createGraphics(150, 150);
            let ind1 = new Individual(window.selectedIndividual.genes);
            ind1.display(0, 0, 150, 150, pg1);
            image(pg1, width / 2 - 75, 100);
          }

          // ✅ 顯示第一階段選圖的完整資訊
          const g = window.selectedIndividual.genes;
          const c = colorHSBPalette[g.colorIndex];
          const h = hue(c).toFixed(0);
          const s = saturation(c).toFixed(0);
          const b = brightness(c).toFixed(0);
          textSize(12);
          text(`顏色索引 ${g.colorIndex}/256（色相 ${h} 彩度 ${s} 明度 ${b}）\n形狀 ${g.shapeType}\n構圖 ${g.layoutType}`, width / 2, 270);


          overrideColorIndex = backupColor;
          overrideShapeType = backupShape;
          overrideLayoutType = backupLayout;
textSize(18);
          text(`接著是您在第二階段調整的三個結果：`, width / 2+4, 380);

          for (let i = 0; i < 3; i++) {
  let baseGenes = selectedGenesList[i];
  let adjust = adjustmentSets[i];

  let hVal, sVal, bVal;
  let colorIndex;
  let shapeType = (i === 1) ? adjust.shape : baseGenes.shapeType;
  let layoutType = (i === 2) ? adjust.layout : baseGenes.layoutType;

  if (i === 0) {
    hVal = adjust.hue;
    sVal = adjust.saturation;
    bVal = adjust.brightness;
    colorIndex = 999;

    colorHSBPalette[999] = color(hVal, sVal, bVal);
    overrideColorIndex = 999;
    window.overrideHue = hVal;
    window.overrideSaturation = sVal;
    window.overrideBrightness = bVal;
  } else {
    colorIndex = baseGenes.colorIndex;
    let c = colorHSBPalette[colorIndex];
    hVal = hue(c);
    sVal = saturation(c);
    bVal = brightness(c);

    overrideColorIndex = colorIndex;
    window.overrideHue = undefined;
    window.overrideSaturation = undefined;
    window.overrideBrightness = undefined;
  }

  overrideColorIndex = null;
  overrideShapeType = shapeType;
  overrideLayoutType = layoutType;

  let pg = createGraphics(200, 200);
  let ind = new Individual(baseGenes);
  ind.display(0, 0, 150, 150, pg);

  textSize(14);
  textAlign(CENTER);
  let baseX = 120;
  let baseY = 420;
  let cx = baseX + i * 180 + 75;

  image(pg, baseX + i * 180, baseY);
  text(["① 色彩調整", "② 形狀調整", "③ 構圖調整"][i], cx, baseY + 180);

  textSize(12);
  textAlign(CENTER);
  text(`色相 ${hVal.toFixed(0)} 彩度 ${sVal.toFixed(0)} 明度 ${bVal.toFixed(0)}`, cx, baseY + 228);

  text(`形狀 ${shapeType}`, cx, baseY + 246);
  text(`構圖 ${layoutType}`, cx, baseY + 264);



}


          window.overrideHue = undefined;
          window.overrideSaturation = undefined;
          window.overrideBrightness = undefined;

          inSecondStage = false;
          noLoop();
        }
      });

    window.adjustmentUISetupDone = true;
  }

  if (secondStageButton) secondStageButton.hide();
}

function endExperiment() {
  if (!window.selectedSnapshot) {
    alert("⚠ 無法取得圖像快照，請先從九張圖中選擇一張！");
    return;
  }

  inFinalStage = true;  // ✅ 進入最終階段，鎖定互動
  if (!window.selectedSnapshot) {
    alert("⚠ 無法取得圖像快照，請先從九張圖中選擇一張！");
    return;
  }

  clear();
  background(240);
  textAlign(CENTER);
  textSize(20);
  fill(0);
  text(`你總共選擇了 ${generation + 1} 次，這是你最終的選擇`, width / 2, 250);

  // ✅ 直接使用當時記下來的圖像
  image(window.selectedSnapshot, (width - 235) / 2, (height - 150) / 2);

  if (finishButton) finishButton.hide();
  if (nextButton) nextButton.hide();
  if (restartButton) restartButton.hide();

  let allButtons = selectAll('button');
  for (let btn of allButtons) {
    if (btn.html() === '⬅ Back') btn.hide();
  }

  secondStageButton.show();
  noLoop();
}

function draw() {
  let { overrideHue, overrideSaturation, overrideBrightness } = window;
  background(240);
  textAlign(CENTER);
  textSize(18);
  textStyle(NORMAL);  
  noStroke();  
  fill(0);  
  textSize(14);
  textAlign(CENTER);
  if (inSecondStage) {
      
    
let imageWidth = 200;
let imageHeight = 200;
let spacing = 20;
let totalWidth = 3 * imageWidth + 2 * spacing;
let startX = (width - totalWidth) / 2;

let imageTop = 80;
let labelOffset = 220;
let totalHeight = imageTop + imageHeight + 30 + 20;
let startY = (height - totalHeight) / 2;
    
    text("第二階段：請針對三圖分別調整：① 色彩、② 形狀、③ 構圖", width / 2, startY - 40);
    
    for (let i = 0; i < 3; i++) {
      const baseGenes = selectedGenesList[i];
      const adjust = adjustmentSets[i];
      if (!baseGenes || !adjust) continue;

      let colorIndex = baseGenes.colorIndex;
      let shapeType = (i === 1) ? adjust.shape : baseGenes.shapeType;
      let layoutType = (i === 2) ? adjust.layout : baseGenes.layoutType;
      let s = (i === 0) ? adjust.saturation : 100;
      let b = (i === 0) ? adjust.brightness : 100;
      if (i === 0) {
  let h = adjust.hue;
  colorHSBPalette[999] = color(h, s, b);
  overrideColorIndex = 999;

  window.overrideHue = h;
  window.overrideSaturation = s;
  window.overrideBrightness = b;
} else {
  overrideColorIndex = colorIndex;
  window.overrideHue = undefined;
  window.overrideSaturation = undefined;
  window.overrideBrightness = undefined;
}


      overrideShapeType = shapeType;
      overrideLayoutType = layoutType;
      saturationSlider = { value: () => s };
      brightnessSlider = { value: () => b };

      let pg = previewGraphics[i];
      pg.clear();
      let ind = new Individual(baseGenes);
      ind.display(0, 0, 200, 200, pg);
      image(pg, startX + i * (imageWidth + spacing), startY);
text(["① 色彩調整", "② 形狀調整", "③ 構圖調整"][i],
         startX + i * (imageWidth + spacing) + imageWidth / 2,
         startY + labelOffset);
    }
    return;
  }

text(`Generation: ${generation} / ${maxGenerations}`, width / 2, 30);

if (generation >= maxGenerations && population.lastSelected) {
  population.lastSelected.display(width / 2 - 100, height / 2 - 100, 200, 200);
  textSize(24);
  fill(0);
  text("✅ Final Generation Reached", width / 2, height - 60);
  return;
}

let gridSize = 3;
let cellW = 200;
let cellH = 200;
let padding = 20;
let offsetX = 60;
let offsetY = 60;

for (let i = 0; i < 9; i++) {
  let row = floor(i / gridSize);
  let col = i % gridSize;
  let x = offsetX + col * (cellW + padding);
  let y = offsetY + row * (cellH + padding);
  population.individuals[i].display(x, y, cellW, cellH);

if (window.selectedRawIndividual === population.individuals[i]) {
  if (!snapshotCaptured) {
    window.selectedSnapshot = get(x, y, cellW, cellH);
    snapshotCaptured = true;
  }
  noStroke();
  fill(100, 100, 100, 30);
  rect(x, y, cellW, cellH);
}


  }

function setupCompleteButton() {
  completeButton = createButton("✅ 完成所有調整")
    .position(width / 2 - 43, height - 100)
    .mousePressed(() => {
      if (completeButton) completeButton.remove();
      if (restartButton) restartButton.hide();
      if (nextButton) nextButton.hide();
      if (secondStageButton) secondStageButton.hide();
      if (window.createdSliders) window.createdSliders.forEach(slider => slider.hide());
      if (window.resetButtons) window.resetButtons.forEach(btn => btn.hide());
      if (window.createdLabels) window.createdLabels.forEach(label => label.remove());

      let results = [];
      for (let i = 0; i < 3; i++) {
        results.push({
          originalGenes: selectedGenesList[i],
          adjusted: adjustmentSets[i]
        });
      }

      let payload = {
        userInfo: window.userInfo || { age: '', gender: '', nationality: '' },
        generationUsed: generation + 1,
        firstChoice: window.selectedIndividual.genes,
        adjustments: results
      };


      clear();
      background(240);
      textAlign(CENTER);
      textSize(18);
      fill(0);
      text(`你總共使用了 ${generation + 1} / ${maxGenerations} 次生成`, width / 2, 40);
      text(`以下是您在第一階段選擇的結果：`, width / 2, 70);

      const backupColor = overrideColorIndex;
      const backupShape = overrideShapeType;
      const backupLayout = overrideLayoutType;
      overrideColorIndex = null;
      overrideShapeType = null;
      overrideLayoutType = null;

      if (window.selectedSnapshot) {
        image(window.selectedSnapshot, width / 2 - 75, 100, 150, 150);
      }

      overrideColorIndex = backupColor;
      overrideShapeType = backupShape;
      overrideLayoutType = backupLayout;

      text(`接著是您在第二階段調整的三個結果：`, width / 2, 300);
      for (let i = 0; i < 3; i++) {
        const baseGenes = selectedGenesList[i];
        const adjust = adjustmentSets[i];
        const shapeType = (i === 1) ? adjust.shape : baseGenes.shapeType;
        const layoutType = (i === 2) ? adjust.layout : baseGenes.layoutType;
        const s = (i === 0) ? adjust.saturation : 100;
        const b = (i === 0) ? adjust.brightness : 100;
        const h = (i === 0) ? adjust.hue : undefined;
        const colorIndex = baseGenes.colorIndex;

        if (i === 0) {
          colorHSBPalette[999] = color(h, s, b);
          overrideColorIndex = 999;
          window.overrideHue = h;
          window.overrideSaturation = s;
          window.overrideBrightness = b;
        } else {
          overrideColorIndex = colorIndex;
          window.overrideHue = undefined;
          window.overrideSaturation = undefined;
          window.overrideBrightness = undefined;
        }

        overrideShapeType = shapeType;
        overrideLayoutType = layoutType;

        const pg = createGraphics(200, 200);
        const ind = new Individual(baseGenes);
        ind.display(0, 0, 150, 150, pg);

        const baseX = 120;
        const baseY = 350;
        image(pg, baseX + i * 180, baseY);
        textSize(14);
        textAlign(CENTER);
        text(["① 色彩調整", "② 形狀調整", "③ 構圖調整"][i], baseX + i * 180 + 75, baseY + 170);
      }

      resetGlobalState();
      inSecondStage = false;
      noLoop();
    });
}


  }
  
function mouseMoved() {
  if (inSecondStage) {
    redraw();
  }
}

function mousePressed() {
 if (inSecondStage || inFinalStage) {
    console.log("🚫 鎖定階段，點擊無效");
    return;
  }


  if (generation >= maxGenerations) return;

  let gridSize = 3;
  let cellW = 200;
  let cellH = 200;
  let padding = 20;
  let offsetX = 60;
  let offsetY = 60;

  let clicked = false;

  for (let i = 0; i < 9; i++) {
    let row = floor(i / gridSize);
    let col = i % gridSize;
    let x = offsetX + col * (cellW + padding);
    let y = offsetY + row * (cellH + padding);

   if (mouseX > x && mouseX < x + cellW && mouseY > y && mouseY < y + cellH) {
  let original = population.individuals[i];

  // ✅ 保留「原始個體」作為下一輪使用對象
  window.selectedRawIndividual = original;
  window.selectedIndividual = new Individual(original.genes, original.seed); // 只用來畫圖，不影響原始基因

  snapshotCaptured = false;
  console.log("✅ 使用者選擇了第", i, "張圖");
  redraw();
  clicked = true;
  break;
}


  }

  if (!clicked) {
    console.log("⬜️ 點選空白區域，無動作");
  }
}




function generateNewSet(selected) {
  const rawSelected = window.selectedRawIndividual;

  const index = population.individuals.findIndex(ind => ind === rawSelected);
  if (index === -1) {
    alert("⚠ 無法找到選中的圖像，請重新選擇");
    return;
  }

  historyStack.push({
    generation,
    population: population.individuals.map(ind => new Individual(ind.genes, ind.seed)),
    selected: rawSelected
  });

  population.evolve(rawSelected, index); // ✅ 原個體進入下一輪
  generation++;

  // ✅ 清除選取狀態
  window.selectedIndividual = null;
  window.selectedRawIndividual = null;
  snapshotCaptured = false;

  if (generation >= maxGenerations) {
    noLoop();
    restartButton.show();
  }

  redraw();
}


function setupUI() {
  restartButton = createButton('Restart');
  restartButton.position(width / 2 - 40, height - 10);
  restartButton.mousePressed(restart);
  restartButton.hide();
  
  nextButton = createButton('Next Generation');
  nextButton.position(width / 2 - 60, height + 10);
  nextButton.mousePressed(handleNext);
  nextButton.mousePressed(() => {
    if (!window.selectedIndividual) {
      alert("請先選擇一張圖像！");
      return;
    }
    const selected = window.selectedIndividual;
    window.selectedIndividual = null;
    generateNewSet(selected);
  });
let backButton = createButton('⬅ Back');
backButton.position(width / 2 - 150, height + 10);
backButton.mousePressed(goBack);
  

secondStageButton = createButton('Next → 第二階段');
secondStageButton.position(width / 2 - 60, height + 10);
secondStageButton.mousePressed(startSecondStage);
secondStageButton.hide(); // 一開始先隱藏

}

function scheduleRedraw() {
  if (inSecondStage) {
    if (redrawTimeout) clearTimeout(redrawTimeout);
    redrawTimeout = setTimeout(() => {
      redraw();
    }, 30);
  }
}

function createAdjustmentSliders(i, x, y) {
  const genes = selectedGenesList[i];

  if (!window.createdSliders) window.createdSliders = [];
  if (!window.createdLabels) window.createdLabels = [];

  if (!window.resetButtons) window.resetButtons = [];

  if (i === 0) {
    let label0 = createP("色相");
label0.position(x-45, y - 420);
window.createdLabels.push(label0);
let initHue = adjustmentSets[i]?.hue ?? hue(colorHSBPalette[selectedGenesList[i].colorIndex]);

let hueSlider = createSlider(0, 360, initHue);

hueSlider.position(x -5, y - 400);
hueSlider.input(() => {
  adjustmentSets[i].hue = hueSlider.value();
  scheduleRedraw();
});
window.createdSliders.push(hueSlider);

  let label1 = createP("彩度");
  label1.position(x-45, y-400);
  if (!window.createdLabels) window.createdLabels = [];
  window.createdLabels.push(label1);

  let satSlider = createSlider(0, 100, 100);
  satSlider.position(x -5, y-380);
  satSlider.input(() => {
    adjustmentSets[i].saturation = satSlider.value();
    scheduleRedraw();
  });
  if (!window.createdSliders) window.createdSliders = [];
  window.createdSliders.push(satSlider);

  let label2 = createP("明度");
  label2.position(x-45, y -380);
  window.createdLabels.push(label2);

  let briSlider = createSlider(0, 100, 100);
  briSlider.position(x -5, y -360);
  briSlider.input(() => {
    adjustmentSets[i].brightness = briSlider.value();
    scheduleRedraw();
  });
  window.createdSliders.push(briSlider);
}

if (i === 1) {
  let label3 = createP("形狀");
  label3.position(x-40, y-400);
  if (!window.createdLabels) window.createdLabels = [];
  window.createdLabels.push(label3);

  let shapeSlider = createSlider(0, 255, genes.shapeType);
  shapeSlider.position(x , y-380);
  shapeSlider.input(() => {
    adjustmentSets[i].shape = shapeSlider.value();
    scheduleRedraw();
  });
  if (!window.createdSliders) window.createdSliders = [];
  window.createdSliders.push(shapeSlider);
}

if (i === 2) {
  let label4 = createP("構圖");
  label4.position(x-40, y-400);
  if (!window.createdLabels) window.createdLabels = [];
  window.createdLabels.push(label4);

  let layoutSlider = createSlider(0, 255, genes.layoutType);
  layoutSlider.position(x , y-380);
  layoutSlider.input(() => {
    adjustmentSets[i].layout = layoutSlider.value();
    scheduleRedraw();
  });
  if (!window.createdSliders) window.createdSliders = [];
  window.createdSliders.push(layoutSlider);
}


  let resetButton = createButton("🔁 重設此圖");
  resetButton.position(x + 20, y - 300);
  resetButton.mousePressed(() => {
    adjustmentSets[i] = {
  hue: hue(colorHSBPalette[selectedGenesList[i].colorIndex]), // ✅ 補回色相
  saturation: 100,
  brightness: 100,
  shape: genes.shapeType,
  layout: genes.layoutType
};

    scheduleRedraw();
  });
  window.resetButtons.push(resetButton); // ✅ 記錄
}

function goBack() {
  if (historyStack.length === 0) {
    alert("🚫 沒有更早的紀錄可以返回了！");
    return;
  }

  let previous = historyStack.pop();

  generation = previous.generation;
  population = new Population(0); // 先清空
  population.individuals = previous.population.map(ind => new Individual(ind.genes));
  window.selectedIndividual = previous.selected;

  redraw();
}

function handleNext() {
  if (!window.selectedIndividual) {
    alert("請先選擇一張圖像！");
    return;
  }
  generateNewSet(window.selectedIndividual);
  window.selectedIndividual = null;
}

function restart() {
  inFinalStage = false;
  generation = 0;
  population = new Population(9);
  restartButton.hide();
  nextButton.show(); // 重新顯示 next 按鈕（已存在，不用再建立）
  loop();
  redraw();
}

function mutate(genes) {
let newGenes = Object.assign({}, genes);  // 複製原來的基因，避免改到原資料
  if (random() < 0.6) newGenes.colorIndex = (newGenes.colorIndex + int(random(-3, 4)) + 256) % 256;
  if (random() < 0.4) newGenes.shapeType = (newGenes.shapeType + int(random(-2, 3)) + 256) % 256;
  if (random() < 0.4) newGenes.layoutType = (newGenes.layoutType + int(random(-2, 3)) + 256) % 256;
  return newGenes;

}

function crossover(g1, g2) {
  return {
    colorIndex: random([g1.colorIndex, g2.colorIndex]),
    shapeType: random([g1.shapeType, g2.shapeType]),
    layoutType: random([g1.layoutType, g2.layoutType])
  };
}

function resetOverrides() {
  overrideColorIndex = null;
  overrideShapeType = null;
  overrideLayoutType = null;
} 

