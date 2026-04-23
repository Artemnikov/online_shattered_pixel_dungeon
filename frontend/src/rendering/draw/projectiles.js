import { PROJECTILE_SPEED } from '../../constants';

export function advanceAndDrawProjectiles(ctx, { projectilesRef }) {
  const finishedIndices = [];
  projectilesRef.current.forEach((proj, index) => {
    const dx = proj.targetX - proj.startX;
    const dy = proj.targetY - proj.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    proj.progress += PROJECTILE_SPEED * 15;

    const ratio = dist > 0 ? Math.min(1, proj.progress / dist) : 1;
    proj.x = proj.startX + dx * ratio;
    proj.y = proj.startY + dy * ratio;

    if (ratio >= 1) {
      proj.finished = true;
      finishedIndices.push(index);
    }

    ctx.fillStyle = proj.type === 'magic_bolt' ? '#3498db' : '#ecf0f1';
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  for (let i = finishedIndices.length - 1; i >= 0; i--) {
    projectilesRef.current.splice(finishedIndices[i], 1);
  }
}
