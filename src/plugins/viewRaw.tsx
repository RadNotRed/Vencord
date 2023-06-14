/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { addButton, removeButton } from "@api/MessagePopover";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { copyWithToast } from "@utils/misc";
import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Button, ChannelStore, Forms, Parser, Text } from "@webpack/common";
import { Message } from "discord-types/general";


const CopyIcon = () => {
    return (
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" width="22" height="22">
            <path
                d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
        </svg>);
};

function sortObject<T extends object>(obj: T): T {
    return Object.fromEntries(Object.entries(obj).sort(([k1], [k2]) => k1.localeCompare(k2))) as T;
}

function cleanMessage(msg: Message) {
    const clone = sortObject(JSON.parse(JSON.stringify(msg)));
    for (const key of [
        "email",
        "phone",
        "mfaEnabled",
        "personalConnectionId"
    ]) delete clone.author[key];

    // message logger added properties
    const cloneAny = clone as any;
    delete cloneAny.editHistory;
    delete cloneAny.deleted;
    cloneAny.attachments?.forEach(a => delete a.deleted);

    return clone;
}

function CodeBlock(props: { content: string, lang: string; }) {
    return (
        // make text selectable
        <div style={{ userSelect: "text" }}>
            {Parser.defaultRules.codeBlock.react(props, null, {})}
        </div>
    );
}

function openViewRawModal(msg: Message) {
    msg = cleanMessage(msg);
    const msgJson = JSON.stringify(msg, null, 4);

    const key = openModal(props => (
        <ErrorBoundary>
            <ModalRoot {...props} size={ModalSize.LARGE}>
                <ModalHeader>
                    <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>View Raw</Text>
                    <ModalCloseButton onClick={() => closeModal(key)} />
                </ModalHeader>
                <ModalContent>
                    <div style={{ padding: "16px 0" }}>
                        {!!msg.content && (
                            <>
                                <Forms.FormTitle tag="h5">Content</Forms.FormTitle>
                                <CodeBlock content={msg.content} lang="" />
                                <Forms.FormDivider className={Margins.bottom20} />
                            </>
                        )}

                        <Forms.FormTitle tag="h5">Message Data</Forms.FormTitle>
                        <CodeBlock content={msgJson} lang="json" />
                    </div>
                </ModalContent >
                <ModalFooter>
                    <Flex cellSpacing={10}>
                        <Button onClick={() => copyWithToast(msgJson, "Message data copied to clipboard!")}>
                            Copy Message JSON
                        </Button>
                        <Button onClick={() => copyWithToast(msg.content, "Content copied to clipboard!")}>
                            Copy Raw Content
                        </Button>
                    </Flex>
                </ModalFooter>
            </ModalRoot >
        </ErrorBoundary >
    ));
}

const settings = definePluginSettings({
    clickMethod: {
        description: "Change the button to view the raw content/data of any message.",
        type: OptionType.SELECT,
        options: [
            { label: "Left Click to view the raw content.", value: "Left", default: true },
            { label: "Right click to view the raw content.", value: "Right" }
        ]
    }
});

export default definePlugin({
    name: "ViewRaw",
    description: "Copy and view the raw content/data of any message.",
    authors: [Devs.KingFish, Devs.Ven, Devs.rad],
    dependencies: ["MessagePopoverAPI"],
    settings,

    start() {
        addButton("ViewRaw", msg => {
            const handleClick = () => {
                if (settings.store.clickMethod === "Right") {
                    copyWithToast(msg.content);
                } else {
                    openViewRawModal(msg);
                }
            };

            const handleContextMenu = e => {
                if (settings.store.clickMethod === "Left") {
                    e.preventDefault();
                    e.stopPropagation();
                    copyWithToast(msg.content);
                } else {
                    e.preventDefault();
                    e.stopPropagation();
                    openViewRawModal(msg);
                }
            };

            const label = settings.store.clickMethod === "Right"
                ? "Copy Raw (Left Click) / View Raw (Right Click)"
                : "View Raw (Left Click) / Copy Raw (Right Click)";

            return {
                label,
                icon: CopyIcon,
                message: msg,
                channel: ChannelStore.getChannel(msg.channel_id),
                onClick: handleClick,
                onContextMenu: handleContextMenu
            };
        });
    },

    stop() {
        removeButton("CopyRawMessage");
    }
});
