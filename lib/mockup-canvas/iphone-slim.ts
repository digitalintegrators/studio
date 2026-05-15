import { hexToRgba } from "@/lib/utils";
import {
    drawWifiIcon,
    drawSignalBars,
    drawBattery,
} from "@/lib/canvas-icons";
import type { MockupCanvasContext, MockupDrawResult } from "./types";
import { drawRoundedRectPath, drawMockupShadow } from "./shared";

export function drawIPhoneSlimMockup(context: MockupCanvasContext): MockupDrawResult {
    const { ctx, x, y, width, height, config, cornerRadius, shadowBlur } = context;
    const isDark = config.darkMode;
    
    const frameColor = isDark ? config.frameColor : "#e5e5e5";
    const headerOpacity = config.headerOpacity ?? 100;

    const headerScale = (config.headerScale || 100) / 100;

    const framePadding = 6 * headerScale;
    const statusBarHeight = 28 * headerScale;
    const dynamicIslandHeight = 18 * headerScale;
    const dynamicIslandTop = 6 * headerScale;
    const homeIndicatorHeight = 3 * headerScale;
    const homeIndicatorBottom = 6 * headerScale;

    const borderColor = isDark ? "#404040" : "#525252";
    const statusBarText = isDark ? "#ffffff" : "#000000";

    const outerRadius = cornerRadius * 8;
    drawMockupShadow(ctx, x, y, width, height, outerRadius, shadowBlur);

    ctx.save();
    const drawButton = (percentY: number, percentH: number, isLeft: boolean) => {
        const btnWidth = 4; // Ancho del botón (similar a w-1)
        const btnRadius = 2; // Radio de las esquinas
        const overlap = 2; // Píxeles que entran hacia el marco para ocultar la unión
        const btnY = y + (height * percentY);
        const btnH = height * percentH;

        ctx.beginPath();
        if (isLeft) {
            const btnX = x - btnWidth;
            ctx.moveTo(btnX + btnWidth + overlap, btnY);
            ctx.lineTo(btnX + btnRadius, btnY);
            ctx.arcTo(btnX, btnY, btnX, btnY + btnRadius, btnRadius);
            ctx.lineTo(btnX, btnY + btnH - btnRadius);
            ctx.arcTo(btnX, btnY + btnH, btnX + btnRadius, btnY + btnH, btnRadius);
            ctx.lineTo(btnX + btnWidth + overlap, btnY + btnH);
        } else {
            const btnX = x + width;
            ctx.moveTo(btnX - overlap, btnY);
            ctx.lineTo(btnX + btnWidth - btnRadius, btnY);
            ctx.arcTo(btnX + btnWidth, btnY, btnX + btnWidth, btnY + btnRadius, btnRadius);
            ctx.lineTo(btnX + btnWidth, btnY + btnH - btnRadius);
            ctx.arcTo(btnX + btnWidth, btnY + btnH, btnX + btnWidth - btnRadius, btnY + btnH, btnRadius);
            ctx.lineTo(btnX - overlap, btnY + btnH);
        }
        ctx.fillStyle = hexToRgba(frameColor, headerOpacity);
        ctx.fill();
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.stroke();
    };

    drawButton(0.15, 0.06, true);
    drawButton(0.24, 0.12, true);
    drawButton(0.28, 0.14, false);
    ctx.restore();

    ctx.save();
    drawRoundedRectPath(ctx, x, y, width, height, outerRadius);
    ctx.fillStyle = hexToRgba(frameColor, headerOpacity);
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    const screenX = x + framePadding;
    const screenY = y + framePadding;
    const screenWidth = width - framePadding * 2;
    const screenHeight = height - framePadding * 2;
   const innerRadius = Math.max(0, outerRadius - framePadding);

    ctx.save();
    drawRoundedRectPath(ctx, screenX, screenY, screenWidth, screenHeight, innerRadius);
    ctx.fillStyle = "#000000";
    ctx.fill();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    const dynamicIslandWidth = screenWidth * 0.28;
    const dynamicIslandX = screenX + (screenWidth - dynamicIslandWidth) / 2;
    const dynamicIslandY = screenY + dynamicIslandTop;

    ctx.save();
    drawRoundedRectPath(ctx, dynamicIslandX, dynamicIslandY, dynamicIslandWidth, dynamicIslandHeight, dynamicIslandHeight / 2);
    ctx.fillStyle = "#000000";
    ctx.fill();
    ctx.restore();

    const timeFontSize = 10 * headerScale;
    const timeX = screenX + 24 * headerScale;
    const timeY = screenY + statusBarHeight / 2 + 2;

    ctx.save();
    ctx.font = `bold ${timeFontSize}px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = statusBarText;
    ctx.textBaseline = "middle";
    ctx.fillText("9:41", timeX, timeY);
    ctx.restore();

    const indicatorsY = timeY - 5 * headerScale;
    const iconStatusSize = 12 * headerScale;
    const batteryWidth = 20 * headerScale;
    const batteryHeight = 10 * headerScale;

    const batteryX = screenX + screenWidth - 24 * headerScale - batteryWidth;
    const batteryY = timeY - batteryHeight / 2;
    drawBattery(ctx, batteryX, batteryY, batteryWidth, batteryHeight, statusBarText, 0.9);

    const wifiX = batteryX - iconStatusSize - 6 * headerScale;
    const wifiY = indicatorsY;
    drawWifiIcon(ctx, wifiX, wifiY, iconStatusSize, statusBarText);

    const signalX = wifiX - iconStatusSize - 4 * headerScale;
    const signalY = indicatorsY;
    drawSignalBars(ctx, signalX, signalY, iconStatusSize, statusBarText);

    const homeIndicatorWidth = screenWidth * 0.35;
    const homeIndicatorX = screenX + (screenWidth - homeIndicatorWidth) / 2;
    const homeIndicatorY = screenY + screenHeight - homeIndicatorBottom - homeIndicatorHeight;

    ctx.save();
    drawRoundedRectPath(ctx, homeIndicatorX, homeIndicatorY, homeIndicatorWidth, homeIndicatorHeight, homeIndicatorHeight / 2);
    ctx.fillStyle = `${statusBarText}15`;
    ctx.fill();
    ctx.restore();

    return {
        contentX: screenX,
        contentY: screenY + statusBarHeight,
        contentWidth: screenWidth,
        contentHeight: screenHeight - statusBarHeight - homeIndicatorBottom - homeIndicatorHeight,
    };
}