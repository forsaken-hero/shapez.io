import { makeOffscreenBuffer } from "../../../core/buffer_utils";
import { globalConfig } from "../../../core/config";
import { DrawParameters } from "../../../core/draw_parameters";
import { KEYMAPPINGS } from "../../key_action_mapper";
import { enumLayer } from "../../root";
import { THEME } from "../../theme";
import { BaseHUDPart } from "../base_hud_part";
import { Loader } from "../../../core/loader";
import { lerp } from "../../../core/utils";

const wiresBackgroundDpi = 4;

export class HUDWiresOverlay extends BaseHUDPart {
    createElements(parent) {}

    initialize() {
        // Probably not the best location, but the one which makes most sense
        this.root.keyMapper.getBinding(KEYMAPPINGS.ingame.switchLayers).add(this.switchLayers, this);

        this.generateTilePattern();

        this.currentAlpha = 0.0;
    }

    /**
     * Switches between layers
     */
    switchLayers() {
        if (this.root.currentLayer === enumLayer.regular) {
            this.root.currentLayer = enumLayer.wires;
        } else {
            this.root.currentLayer = enumLayer.regular;
        }
        this.root.signals.editModeChanged.dispatch(this.root.currentLayer);
    }

    /**
     * Generates the background pattern for the wires overlay
     */
    generateTilePattern() {
        const overlayTile = Loader.getSprite("sprites/misc/wires_overlay_tile.png");
        const dims = globalConfig.tileSize * wiresBackgroundDpi;
        const [canvas, context] = makeOffscreenBuffer(dims, dims, {
            smooth: false,
            reusable: false,
            label: "wires-tile-pattern",
        });
        overlayTile.draw(context, 0, 0, dims, dims);
        this.tilePatternCanvas = canvas;
    }

    update() {
        const desiredAlpha = this.root.currentLayer === enumLayer.wires ? 1.0 : 0.0;
        this.currentAlpha = lerp(this.currentAlpha, desiredAlpha, 0.12);
    }

    /**
     *
     * @param {DrawParameters} parameters
     */
    draw(parameters) {
        if (this.currentAlpha < 0.02) {
            return;
        }

        if (this.root.camera.getIsMapOverlayActive()) {
            return;
        }

        if (!this.cachedPatternBackground) {
            this.cachedPatternBackground = parameters.context.createPattern(this.tilePatternCanvas, "repeat");
        }

        const bounds = parameters.visibleRect;

        const scaleFactor = 1 / wiresBackgroundDpi;

        parameters.context.globalAlpha = this.currentAlpha;
        parameters.context.globalCompositeOperation = "darken";
        parameters.context.scale(scaleFactor, scaleFactor);
        parameters.context.fillStyle = this.cachedPatternBackground;
        parameters.context.fillRect(
            bounds.x / scaleFactor,
            bounds.y / scaleFactor,
            bounds.w / scaleFactor,
            bounds.h / scaleFactor
        );
        parameters.context.scale(1 / scaleFactor, 1 / scaleFactor);
        parameters.context.globalCompositeOperation = "source-over";
        parameters.context.globalAlpha = 1;
    }
}
