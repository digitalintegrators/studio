import { hexToRgba } from "@/lib/utils";
import {
    drawWifiIcon,
    drawSignalBars,
    drawBattery,
} from "@/lib/canvas-icons";
import type { MockupCanvasContext, MockupDrawResult } from "./types";
import { drawRoundedRectPath, drawMockupShadow } from "./shared";

export function drawGlassFullMockup(context: MockupCanvasContext): MockupDrawResult {
    const { ctx, x, y, width, height, config, cornerRadius, shadowBlur } = context;
    const isDark = config.darkMode;
    
    const frameColor = isDark ? config.frameColor : "#ffffff";
    const headerOpacity = config.headerOpacity ?? 10;
    const headerScale = (config.headerScale || 100) / 100;

    const framePadding = 12 * headerScale;
    const buttonWidth = 4 * headerScale;
    
    const notchTop = 8 * headerScale;
    const notchWidth = 104 * headerScale;
    const notchHeight = 24 * headerScale;
    const dotSize = 8 * headerScale;
    
    const statusBarHeight = 32 * headerScale;
    const timeFontSize = 10 * headerScale;
    
    const iconStatusSize = 12 * headerScale;
    const batteryWidth = 18 * headerScale;
    const batteryHeight = 10 * headerScale;
    
    const contentPaddingTop = 40 * headerScale;
    
    const homeIndicatorWidth = 128 * headerScale;
    const homeIndicatorHeight = 4 * headerScale;
    const homeIndicatorBottom = 8 * headerScale;

    const screenBg = isDark ? "#0a0a0a" : "#f9f9f9";
    const frameBorderColor = isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.3)";
    const screenBorderColor = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)";
    const notchBg = isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.05)";
    const statusBarText = isDark ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.6)";
    const homeIndicatorBg = isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)";
    const buttonBg = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.4)";

    const outerRadius = cornerRadius * 8;
    drawMockupShadow(ctx, x, y, width, height, outerRadius, shadowBlur);

    ctx.save();
    const drawButton = (percentY: number, percentH: number, isLeft: boolean) => {
        const btnW = buttonWidth;
        const btnR = 2 * headerScale;
        const overlap = 2; // Para solapar con el marco y evitar líneas
        const btnY = y + (height * percentY);
        const btnH = height * percentH;

        ctx.beginPath();
        if (isLeft) {
            const btnX = x - btnW;
            ctx.moveTo(btnX + btnW + overlap, btnY);
            ctx.lineTo(btnX + btnR, btnY);
            ctx.arcTo(btnX, btnY, btnX, btnY + btnR, btnR);
            ctx.lineTo(btnX, btnY + btnH - btnR);
            ctx.arcTo(btnX, btnY + btnH, btnX + btnR, btnY + btnH, btnR);
            ctx.lineTo(btnX + btnW + overlap, btnY + btnH);
        } else {
            const btnX = x + width;
            ctx.moveTo(btnX - overlap, btnY);
            ctx.lineTo(btnX + btnW - btnR, btnY);
            ctx.arcTo(btnX + btnW, btnY, btnX + btnW, btnY + btnR, btnR);
            ctx.lineTo(btnX + btnW, btnY + btnH - btnR);
            ctx.arcTo(btnX + btnW, btnY + btnH, btnX + btnW - btnR, btnY + btnH, btnR);
            ctx.lineTo(btnX - overlap, btnY + btnH);
        }
        ctx.fillStyle = buttonBg;
        ctx.fill();
        ctx.strokeStyle = frameBorderColor;
        ctx.lineWidth = 1;
        ctx.stroke();
    };

    drawButton(0.15, 0.05, true);  // Silencio
    drawButton(0.25, 0.12, true);  // Volumen Arriba
    drawButton(0.28, 0.14, false); // Encendido
    ctx.restore();

    ctx.save();
    drawRoundedRectPath(ctx, x, y, width, height, outerRadius);
    ctx.fillStyle = hexToRgba(frameColor, headerOpacity);
    ctx.fill();
    ctx.strokeStyle = frameBorderColor;
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
    ctx.fillStyle = screenBg;
    ctx.fill();
    ctx.strokeStyle = screenBorderColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    const dynamicIslandX = screenX + (screenWidth - notchWidth) / 2;
    const dynamicIslandY = screenY + notchTop;

    ctx.save();
    drawRoundedRectPath(ctx, dynamicIslandX, dynamicIslandY, notchWidth, notchHeight, notchHeight / 2);
    ctx.fillStyle = notchBg;
    ctx.fill();

    const dotCenterY = dynamicIslandY + notchHeight / 2;
    ctx.beginPath();
    ctx.arc(dynamicIslandX + notchHeight, dotCenterY, dotSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#737373"; // neutral-500
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#404040"; // neutral-700
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(dynamicIslandX + notchWidth - notchHeight, dotCenterY, dotSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#6366f1"; // indigo-500
    ctx.fill();
    ctx.restore();

    const timeX = screenX + 28 * headerScale;
    const timeY = screenY + statusBarHeight / 2 + 2;

    ctx.save();
    ctx.font = `bold ${timeFontSize}px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = statusBarText;
    ctx.textBaseline = "middle";
    ctx.fillText("9:41", timeX, timeY);
    ctx.restore();

    const indicatorsY = timeY - 5 * headerScale;
    
    const batteryX = screenX + screenWidth - 28 * headerScale - batteryWidth;
    const batteryY = timeY - batteryHeight / 2;
    drawBattery(ctx, batteryX, batteryY, batteryWidth, batteryHeight, statusBarText, 0.7);

    const wifiX = batteryX - iconStatusSize - 6 * headerScale;
    const wifiY = indicatorsY;
    drawWifiIcon(ctx, wifiX, wifiY, iconStatusSize, statusBarText);

    const signalX = wifiX - iconStatusSize - 6 * headerScale;
    const signalY = indicatorsY;
    drawSignalBars(ctx, signalX, signalY, iconStatusSize, statusBarText);

    const homeIndicatorX = screenX + (screenWidth - homeIndicatorWidth) / 2;
    const homeIndicatorY = screenY + screenHeight - homeIndicatorBottom - homeIndicatorHeight;

    ctx.save();
    drawRoundedRectPath(ctx, homeIndicatorX, homeIndicatorY, homeIndicatorWidth, homeIndicatorHeight, homeIndicatorHeight / 2);
    ctx.fillStyle = homeIndicatorBg;
    ctx.fill();
    ctx.restore();

    return {
        contentX: screenX,
        contentY: screenY + contentPaddingTop,
        contentWidth: screenWidth,
        contentHeight: screenHeight - contentPaddingTop,
    };
}