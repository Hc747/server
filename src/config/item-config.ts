import { loadConfigurationFiles } from '@server/config/index';
import { cache } from '@server/game-server';
import _ from 'lodash';

export type EquipmentSlot = 'head' | 'back' | 'neck' | 'main_hand' | 'off_hand' | 'torso' |
    'legs' | 'hands' | 'feet' | 'ring' | 'quiver';

export const equipmentIndices = {
    'head': 0,
    'back': 1,
    'neck': 2,
    'main_hand': 3,
    'torso': 4,
    'off_hand': 5,
    'legs': 7,
    'hands': 9,
    'feet': 10,
    'ring': 12,
    'quiver': 13
};

export const equipmentIndex = (equipmentSlot: EquipmentSlot): number => equipmentIndices[equipmentSlot];
export const getEquipmentSlot = (index: number): EquipmentSlot =>
    Object.keys(equipmentIndices).find(key => equipmentIndices[key] === index) as EquipmentSlot;

export type EquipmentType = 'hat' | 'helmet' | 'torso' | 'full_top' | 'one_handed' | 'two_handed';

export interface ItemRequirements {
    skills?: { [key: string]: number };
    quests?: { [key: string]: number };
}

export interface OffensiveBonuses {
    speed?: number;
    stab?: number;
    slash?: number;
    crush?: number;
    magic?: number;
    ranged?: number;
}

export interface DefensiveBonuses {
    stab?: number;
    slash?: number;
    crush?: number;
    magic?: number;
    ranged?: number;
}

export interface SkillBonuses {
    [key: string]: number;
}

export interface EquipmentData {
    equipmentSlot: EquipmentSlot;
    equipmentType?: EquipmentType;
    requirements?: ItemRequirements;
    offensiveBonuses?: OffensiveBonuses;
    defensiveBonuses?: DefensiveBonuses;
    skillBonuses?: SkillBonuses;
}

export interface PresetConfiguration {
    [key: string]: ItemConfiguration;
}

export interface ItemConfiguration {
    extends?: string | string[];
    game_id: number;
    description?: string;
    tradable?: boolean;
    weight?: number;
    equippable?: boolean;
    equipment_data?: {
        equipment_slot: EquipmentSlot;
        equipment_type?: EquipmentType;
        requirements?: ItemRequirements;
        offensive_bonuses?: OffensiveBonuses;
        defensive_bonuses?: DefensiveBonuses;
        skill_bonuses?: SkillBonuses;
    };
    metadata?: { [key: string]: unknown };
}

/**
 * Full server + cache details about a specific game item.
 */
export class ItemDetails {
    key: string;
    gameId: number;
    name: string = '';
    description: string = '';
    tradable: boolean = false;
    equippable: boolean = false;
    weight: number;
    equipmentData: EquipmentData;
    metadata: { [key: string]: unknown } = {};
    stackable: boolean = false;
    value: number = 0;
    members: boolean = false;
    groundOptions: string[] = [];
    inventoryOptions: string[] = [];
    teamId: number;
    notedId: number;
    noteTemplateId: number;
    stackableIds: number[];
    stackableAmounts: number[];
}

function translateConfig(key: string, config: ItemConfiguration): any {
    return {
        key,
        gameId: config.game_id,
        description: config.description,
        tradable: config.tradable,
        equippable: config.equippable,
        weight: config.weight,
        equipmentData: config.equipment_data ? {
            equipmentType: config.equipment_data?.equipment_type || undefined,
            equipmentSlot: config.equipment_data?.equipment_slot || undefined,
            requirements: config.equipment_data?.requirements || undefined,
            offensiveBonuses: config.equipment_data?.offensive_bonuses || undefined,
            defensiveBonuses: config.equipment_data?.defensive_bonuses || undefined,
            skillBonuses: config.equipment_data?.skill_bonuses || undefined,
        } : undefined,
        metadata: config.metadata
    };
}

export async function loadItemConfigurations(): Promise<{ items: { [key: string]: ItemDetails }, idMap: { [key: number]: string } }> {
    const idMap: { [key: number]: string } = {};
    const items: { [key: string]: ItemDetails } = {};
    let presets: PresetConfiguration = {};

    const files = await loadConfigurationFiles('data/items');

    files.forEach(itemConfigs => {
        const itemKeys = Object.keys(itemConfigs);
        itemKeys.forEach(key => {
            if(key === 'presets') {
                // Preset items!
                const newPresets = itemConfigs[key] as PresetConfiguration;
                presets = { ...presets, ...newPresets };
            } else {
                // Standard items
                const itemConfig: ItemConfiguration = itemConfigs[key] as ItemConfiguration;
                idMap[itemConfig.game_id] = key;

                let extensions = itemConfig.extends;
                if(extensions) {
                    if(typeof extensions === 'string') {
                        extensions = [ extensions ];
                    }
                } else {
                    extensions = [];
                }

                let itemDetails = { ...translateConfig(key, itemConfig),
                    ...cache.itemDefinitions.get(itemConfig.game_id) };

                extensions.forEach(presetKey => {
                    const extensionItem = presets[presetKey];
                    if(extensionItem) {
                        itemDetails = _.merge(itemDetails, translateConfig(key, extensionItem));
                    }
                });

                items[key] = itemDetails;
            }
        });
    });

    return { items, idMap };
}