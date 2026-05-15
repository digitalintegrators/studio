import type { MockupCanvasContext, MockupDrawResult } from "./types";
import { drawRoundedRectPath, drawMockupShadow } from "./shared";

export function drawS24UltraMockup(context: MockupCanvasContext): MockupDrawResult {
    const { ctx, x, y, width, height, config, cornerRadius, shadowBlur } = context;
    const isDark = config.darkMode;

    const headerScale = (config.headerScale || 100) / 100;
    const frameColor = isDark ? (config.frameColor || "#171717") : "#e5e5e5";
    
    const framePadding = 10 * headerScale;
    const buttonWidth = 4 * headerScale;
    const buttonRadius = 2 * headerScale;
    
    const cameraTop = 12 * headerScale;
    const cameraSize = 14 * headerScale;
    const cameraLensSize = 4 * headerScale;
    
    const statusBarHeight = 40 * headerScale;
    const statusBarPaddingX = 20 * headerScale;
    const timeFontSize = 10 * headerScale;
    
    const navBarHeight = 40 * headerScale;
    const navIconSize = 12 * headerScale;
    const navGap = 48 * headerScale;

    const screenBg = isDark ? "#000000" : "#ffffff";
    const frameBorderColor = isDark ? "#404040" : "#d4d4d4";
    const screenBorderColor = isDark ? "rgba(255,255,255,0.1)" : "#000000";
    
    const buttonBgColor = isDark ? "#737373" : "#a3a3a3";
    const buttonBorderColor = isDark ? "#262626" : "#737373";
    
    const textAndIconColor = isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)";
    const navIconColor = isDark ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.2)";
    const iconBoxBg = isDark ? "#ffffff" : "#000000";
    const iconBoxText = isDark ? "#000000" : "#ffffff";

    const outerRadius = cornerRadius * 1.2;

    drawMockupShadow(ctx, x, y, width, height, outerRadius, shadowBlur);

    ctx.save();
    const drawSideButton = (percentY: number, percentH: number) => {
        const btnY = y + (height * percentY);
        const btnH = height * percentH;
        const btnX = x + width;

        ctx.beginPath();
        ctx.moveTo(btnX, btnY);
        ctx.lineTo(btnX + buttonWidth - buttonRadius, btnY);
        ctx.arcTo(btnX + buttonWidth, btnY, btnX + buttonWidth, btnY + buttonRadius, buttonRadius);
        ctx.lineTo(btnX + buttonWidth, btnY + btnH - buttonRadius);
        ctx.arcTo(btnX + buttonWidth, btnY + btnH, btnX + buttonWidth - buttonRadius, btnY + btnH, buttonRadius);
        ctx.lineTo(btnX, btnY + btnH);
        
        ctx.fillStyle = buttonBgColor;
        ctx.fill();
        ctx.strokeStyle = buttonBorderColor;
        ctx.lineWidth = 1;
        ctx.stroke();
    };

    drawSideButton(0.20, 0.08); // Volumen
    drawSideButton(0.32, 0.12); // Encendido
    ctx.restore();

    ctx.save();
    drawRoundedRectPath(ctx, x, y, width, height, outerRadius);
    ctx.fillStyle = frameColor;
    ctx.fill();
    ctx.strokeStyle = frameBorderColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    const screenX = x + framePadding;
    const screenY = y + framePadding;
    const screenWidth = width - (framePadding * 2);
    const screenHeight = height - (framePadding * 2);
    const screenRadius = Math.max(0, outerRadius - framePadding);

    ctx.save();
    drawRoundedRectPath(ctx, screenX, screenY, screenWidth, screenHeight, screenRadius);
    ctx.fillStyle = screenBg;
    ctx.fill();
    ctx.strokeStyle = screenBorderColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    const camCenterX = screenX + screenWidth / 2;
    const camCenterY = screenY + cameraTop + cameraSize / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(camCenterX, camCenterY, cameraSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#000000";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(camCenterX, camCenterY, cameraLensSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(99, 102, 241, 0.3)"; // blue-indigo lens reflection
    ctx.fill();
    ctx.restore();

    const statusYCenter = screenY + statusBarHeight / 2;

    ctx.save();
    ctx.font = `500 ${timeFontSize}px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = textAndIconColor;
    ctx.textBaseline = "middle";
    ctx.fillText("12:30", screenX + statusBarPaddingX, statusYCenter + 1); // +1 corrección óptica
    ctx.restore();

    let currentRightX = screenX + screenWidth - statusBarPaddingX;
    const gap = 6 * headerScale;

    const batW = 20 * headerScale;
    const batH = 10 * headerScale;
    currentRightX -= batW;
    
    ctx.save();
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";
    ctx.lineWidth = 1 * headerScale;
    drawRoundedRectPath(ctx, currentRightX, statusYCenter - batH / 2, batW, batH, 2 * headerScale);
    ctx.stroke();
    
    ctx.fillStyle = iconBoxBg;
    const pad = 1 * headerScale;
    drawRoundedRectPath(ctx, currentRightX + pad, statusYCenter - batH / 2 + pad, batW - pad * 2, batH - pad * 2, 1 * headerScale);
    ctx.fill();
    ctx.restore();

    const box5GSize = 14 * headerScale;
    currentRightX -= (box5GSize + gap);

    ctx.save();
    ctx.fillStyle = iconBoxBg;
    drawRoundedRectPath(ctx, currentRightX, statusYCenter - box5GSize / 2, box5GSize, box5GSize, 2 * headerScale);
    ctx.fill();
    
    ctx.font = `bold ${7 * headerScale}px "Inter", sans-serif`;
    ctx.fillStyle = iconBoxText;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("5G", currentRightX + box5GSize / 2, statusYCenter + 0.5);
    ctx.restore();

    const wifiSize = 12 * headerScale;
    currentRightX -= (wifiSize + gap);

    ctx.save();
    ctx.translate(currentRightX, statusYCenter - wifiSize / 2);
    const wifiScale = wifiSize / 24; // El SVG original de Tailwind es 24x24
    ctx.scale(wifiScale, wifiScale);
    const wifiPath = new Path2D("M12 21l-12-12c5.5-5.5 14.5-5.5 20 0l-8 12z");
    ctx.fillStyle = textAndIconColor;
    ctx.globalAlpha = 0.8;
    ctx.fill(wifiPath);
    ctx.restore();

    const navYCenter = screenY + screenHeight - navBarHeight / 2;
    const navCenterX = screenX + screenWidth / 2;

    ctx.save();
    ctx.strokeStyle = navIconColor;
    ctx.lineWidth = 2 * headerScale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const leftIconX = navCenterX - navGap;
    ctx.strokeRect(leftIconX - navIconSize / 2, navYCenter - navIconSize / 2, navIconSize, navIconSize);
    
    ctx.beginPath();
    ctx.arc(navCenterX, navYCenter, navIconSize / 2, 0, Math.PI * 2);
    ctx.stroke();

    const rightIconX = navCenterX + navGap + (4 * headerScale); // Offset visual
    ctx.translate(rightIconX, navYCenter);
    ctx.rotate(45 * Math.PI / 180); // Rota para formar la flecha
    ctx.beginPath();
    const halfIcon = navIconSize / 2;
    ctx.moveTo(-halfIcon, -halfIcon); // Arriba
    ctx.lineTo(-halfIcon, halfIcon);  // Esquina inferior izquierda
    ctx.lineTo(halfIcon, halfIcon);   // Derecha
    ctx.stroke();
    ctx.restore();

    return {
        contentX: screenX,
        contentY: screenY + statusBarHeight,
        contentWidth: screenWidth,
        contentHeight: screenHeight - statusBarHeight - navBarHeight,
    };
}