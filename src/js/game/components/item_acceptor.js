import { enumDirection, enumInvertedDirections, Vector } from "../../core/vector";
import { types } from "../../savegame/serialization";
import { BaseItem, enumItemType } from "../base_item";
import { Component } from "../component";
import { enumLayer } from "../root";

/** @typedef {{
 * pos: Vector,
 * directions: enumDirection[],
 * layer: enumLayer,
 * filter?: enumItemType
 * }} ItemAcceptorSlot */

/**
 * Contains information about a slot plus its location
 * @typedef {{
 *  slot: ItemAcceptorSlot,
 *  index: number,
 *  acceptedDirection: enumDirection
 * }} ItemAcceptorLocatedSlot */

/** @typedef {{
 * pos: Vector,
 * directions: enumDirection[],
 * layer?: enumLayer,
 * filter?: enumItemType
 * }} ItemAcceptorSlotConfig */

export class ItemAcceptorComponent extends Component {
    static getId() {
        return "ItemAcceptor";
    }

    static getSchema() {
        return {
            slots: types.array(
                types.structured({
                    pos: types.vector,
                    directions: types.array(types.enum(enumDirection)),
                    filter: types.nullable(types.enum(enumItemType)),

                    // TODO: MIGRATE
                    layer: types.enum(enumLayer),
                })
            ),
        };
    }

    duplicateWithoutContents() {
        const slotsCopy = [];
        for (let i = 0; i < this.slots.length; ++i) {
            const slot = this.slots[i];
            slotsCopy.push({
                pos: slot.pos.copy(),
                directions: slot.directions.slice(),
                filter: slot.filter,
                layer: slot.layer,
            });
        }

        return new ItemAcceptorComponent({
            slots: slotsCopy,
        });
    }

    /**
     *
     * @param {object} param0
     * @param {Array<ItemAcceptorSlotConfig>} param0.slots The slots from which we accept items
     */
    constructor({ slots = [] }) {
        super();

        /**
         * Fixes belt animations
         * @type {Array<{ item: BaseItem, slotIndex: number, animProgress: number, direction: enumDirection }>}
         */
        this.itemConsumptionAnimations = [];

        this.setSlots(slots);
    }

    /**
     *
     * @param {Array<ItemAcceptorSlotConfig>} slots
     */
    setSlots(slots) {
        /** @type {Array<ItemAcceptorSlot>} */
        this.slots = [];
        for (let i = 0; i < slots.length; ++i) {
            const slot = slots[i];
            this.slots.push({
                pos: slot.pos,
                directions: slot.directions,
                layer: slot.layer || enumLayer.regular,

                // Which type of item to accept (shape | color | all) @see enumItemType
                filter: slot.filter,
            });
        }
    }

    /**
     * Returns if this acceptor can accept a new item at slot N
     * @param {number} slotIndex
     * @param {BaseItem=} item
     */
    canAcceptItem(slotIndex, item) {
        const slot = this.slots[slotIndex];
        return this.filterMatches(slot.filter, item);
    }

    /**
     * Returns if the given filter matches
     * @param {enumItemType|null} filter
     * @param {BaseItem} item
     */
    filterMatches(filter, item) {
        if (!filter) {
            return true;
        }

        const itemType = item.getItemType();
        if (filter === enumItemType.genericEnergy) {
            return itemType === enumItemType.positiveEnergy || itemType === enumItemType.negativeEnergy;
        }

        return itemType === filter;
    }

    /**
     * Called when an item has been accepted so that
     * @param {number} slotIndex
     * @param {enumDirection} direction
     * @param {BaseItem} item
     */
    onItemAccepted(slotIndex, direction, item) {
        this.itemConsumptionAnimations.push({
            item,
            slotIndex,
            direction,
            animProgress: 0.0,
        });
    }

    /**
     * Tries to find a slot which accepts the current item
     * @param {Vector} targetLocalTile
     * @param {enumDirection} fromLocalDirection
     * @param {enumLayer} layer
     * @returns {ItemAcceptorLocatedSlot|null}
     */
    findMatchingSlot(targetLocalTile, fromLocalDirection, layer) {
        // We need to invert our direction since the acceptor specifies *from* which direction
        // it accepts items, but the ejector specifies *into* which direction it ejects items.
        // E.g.: Ejector ejects into "right" direction but acceptor accepts from "left" direction.
        const desiredDirection = enumInvertedDirections[fromLocalDirection];

        // Go over all slots and try to find a target slot
        for (let slotIndex = 0; slotIndex < this.slots.length; ++slotIndex) {
            const slot = this.slots[slotIndex];

            // Make sure the acceptor slot is on the right position
            if (!slot.pos.equals(targetLocalTile)) {
                continue;
            }

            // Make sure the layer matches
            if (slot.layer !== layer) {
                continue;
            }

            // Check if the acceptor slot accepts items from our direction
            for (let i = 0; i < slot.directions.length; ++i) {
                // const localDirection = targetStaticComp.localDirectionToWorld(slot.directions[l]);
                if (desiredDirection === slot.directions[i]) {
                    return {
                        slot,
                        index: slotIndex,
                        acceptedDirection: desiredDirection,
                    };
                }
            }
        }

        return null;
    }
}
