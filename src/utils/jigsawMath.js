export function generatePuzzleGrid(boardW, boardH, cols, rows) {
  const pieces = [];
  const pieceW = boardW / cols;
  const pieceH = boardH / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      pieces.push({
        id: `${c}-${r}`,
        targetX: c * pieceW,
        targetY: r * pieceH,
        width: pieceW,
        height: pieceH,
        edges: {
          top: r === 0 ? 0 : -pieces[(r - 1) * cols + c].edges.bottom,
          right: c === cols - 1 ? 0 : (Math.random() > 0.5 ? 1 : -1),
          bottom: r === rows - 1 ? 0 : (Math.random() > 0.5 ? 1 : -1),
          left: c === 0 ? 0 : -pieces[r * cols + (c - 1)].edges.right
        },
        isPlaced: false,
        currentX: 0,
        currentY: 0
      });
    }
  }
  return { pieces };
}

export function buildPiecePath(ctx, w, h, edges, cutStyle = 'classic') {
  ctx.beginPath();
  ctx.moveTo(0, 0);

  const drawEdge = (length, tabDir) => {
    if (tabDir === 0) {
      ctx.lineTo(length, 0);
      return;
    }

    const tab = tabDir * Math.min(w, h) * 0.25; 
    const absTab = Math.abs(tab); // FIX: Prevents self-intersecting paths on inward tabs
    const mid = length / 2;

    if (cutStyle === 'jagged') {
      ctx.lineTo(length * 0.35, 0);
      ctx.lineTo(mid, -tab);
      ctx.lineTo(length * 0.65, 0);
      ctx.lineTo(length, 0);
    } else if (cutStyle === 'circular') {
      ctx.lineTo(length * 0.35, 0);
      ctx.bezierCurveTo(length * 0.35, -tab*1.2, length * 0.65, -tab*1.2, length * 0.65, 0);
      ctx.lineTo(length, 0);
    } else if (cutStyle === 'blocky') {
      ctx.lineTo(length * 0.35, 0);
      ctx.lineTo(length * 0.35, -tab);
      ctx.lineTo(length * 0.65, -tab);
      ctx.lineTo(length * 0.65, 0);
      ctx.lineTo(length, 0);
    } else if (cutStyle === 'wavy') {
      ctx.bezierCurveTo(length * 0.25, 0, length * 0.25, -tab, mid, -tab);
      ctx.bezierCurveTo(length * 0.75, -tab, length * 0.75, 0, length, 0);
    } else if (cutStyle === 'knob') {
      const neckWidth = Math.min(w, h) * 0.08;
      const bulbWidth = Math.min(w, h) * 0.25;
      ctx.lineTo(mid - neckWidth, 0);
      ctx.lineTo(mid - neckWidth, -tab * 0.5);
      ctx.bezierCurveTo(mid - bulbWidth, -tab * 0.5, mid - bulbWidth, -tab * 1.2, mid, -tab * 1.2);
      ctx.bezierCurveTo(mid + bulbWidth, -tab * 1.2, mid + bulbWidth, -tab * 0.5, mid + neckWidth, -tab * 0.5);
      ctx.lineTo(mid + neckWidth, 0);
      ctx.lineTo(length, 0);
    } else if (cutStyle === 'diamond') {
      ctx.lineTo(mid - absTab, 0);
      ctx.lineTo(mid, -tab * 1.5);
      ctx.lineTo(mid + absTab, 0);
      ctx.lineTo(length, 0);
    } else if (cutStyle === 'stepped') {
      const stepX = absTab * 0.8;
      const stepY = tab * 0.8;
      ctx.lineTo(mid - stepX, 0);
      ctx.lineTo(mid - stepX, -stepY);
      ctx.lineTo(mid + stepX, -stepY);
      ctx.lineTo(mid + stepX, 0);
      ctx.lineTo(length, 0);
    } else if (cutStyle === 'spiky') {
      ctx.lineTo(length * 0.3, 0);
      ctx.lineTo(length * 0.4, -tab * 1.2);
      ctx.lineTo(mid, -tab * 0.4);
      ctx.lineTo(length * 0.6, -tab * 1.2);
      ctx.lineTo(length * 0.7, 0);
      ctx.lineTo(length, 0);
    } else {
      const neckWidth = Math.min(w, h) * 0.12;
      const bulbWidth = Math.min(w, h) * 0.22;
      ctx.lineTo(mid - neckWidth, 0);
      ctx.bezierCurveTo(mid - neckWidth, -tab*0.2, mid - bulbWidth, -tab, mid, -tab);
      ctx.bezierCurveTo(mid + bulbWidth, -tab, mid + neckWidth, -tab*0.2, mid + neckWidth, 0);
      ctx.lineTo(length, 0);
    }
  };

  drawEdge(w, edges.top);
  ctx.translate(w, 0);
  ctx.rotate(Math.PI / 2);
  
  drawEdge(h, edges.right);
  ctx.translate(h, 0);
  ctx.rotate(Math.PI / 2);
  
  drawEdge(w, edges.bottom);
  ctx.translate(w, 0);
  ctx.rotate(Math.PI / 2);
  
  drawEdge(h, edges.left);
  ctx.translate(h, 0);
  ctx.rotate(Math.PI / 2);
}
