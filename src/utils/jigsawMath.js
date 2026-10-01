export function generatePuzzleGrid(width, height, cols, rows) {
  const pieces = [];
  const pieceWidth = width / cols;
  const pieceHeight = height / rows;

  // 1 = Tab (out), -1 = Blank (in), 0 = Flat (border)
  const hEdges = Array.from({ length: rows }, () => 
    Array.from({ length: cols - 1 }, () => Math.random() > 0.5 ? 1 : -1)
  );
  const vEdges = Array.from({ length: rows - 1 }, () => 
    Array.from({ length: cols }, () => Math.random() > 0.5 ? 1 : -1)
  );

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const topEdge = y === 0 ? 0 : -vEdges[y - 1][x];
      const rightEdge = x === cols - 1 ? 0 : hEdges[y][x];
      const bottomEdge = y === rows - 1 ? 0 : vEdges[y][x];
      const leftEdge = x === 0 ? 0 : -hEdges[y][x - 1];

      pieces.push({
        id: `piece_${x}_${y}`,
        targetX: x * pieceWidth,
        targetY: y * pieceHeight,
        // Start them scattered randomly on the board
        currentX: Math.random() * (width - pieceWidth),
        currentY: Math.random() * (height - pieceHeight),
        width: pieceWidth,
        height: pieceHeight,
        edges: { top: topEdge, right: rightEdge, bottom: bottomEdge, left: leftEdge },
        isPlaced: false
      });
    }
  }
  return { pieces, pieceWidth, pieceHeight };
}

export function buildPiecePath(ctx, width, height, edges) {
  const tabSize = Math.min(width, height) * 0.25;
  
  ctx.beginPath();
  ctx.moveTo(0, 0);

  // Top Edge
  if (edges.top === 0) ctx.lineTo(width, 0);
  else {
    ctx.lineTo(width / 2 - tabSize, 0);
    ctx.bezierCurveTo(width / 2 - tabSize, -tabSize * edges.top * 2, width / 2 + tabSize, -tabSize * edges.top * 2, width / 2 + tabSize, 0);
    ctx.lineTo(width, 0);
  }

  // Right Edge
  if (edges.right === 0) ctx.lineTo(width, height);
  else {
    ctx.lineTo(width, height / 2 - tabSize);
    ctx.bezierCurveTo(width + tabSize * edges.right * 2, height / 2 - tabSize, width + tabSize * edges.right * 2, height / 2 + tabSize, width, height / 2 + tabSize);
    ctx.lineTo(width, height);
  }

  // Bottom Edge
  if (edges.bottom === 0) ctx.lineTo(0, height);
  else {
    ctx.lineTo(width / 2 + tabSize, height);
    ctx.bezierCurveTo(width / 2 + tabSize, height + tabSize * edges.bottom * 2, width / 2 - tabSize, height + tabSize * edges.bottom * 2, width / 2 - tabSize, height);
    ctx.lineTo(0, height);
  }

  // Left Edge
  if (edges.left === 0) ctx.lineTo(0, 0);
  else {
    ctx.lineTo(0, height / 2 + tabSize);
    ctx.bezierCurveTo(-tabSize * edges.left * 2, height / 2 + tabSize, -tabSize * edges.left * 2, height / 2 - tabSize, 0, height / 2 - tabSize);
    ctx.lineTo(0, 0);
  }
  ctx.closePath();
}
