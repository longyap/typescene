import { Component, managedChild } from "../core";
import { UIComponent, UIComponentEvent, UIComponentEventHandler, UIRenderable } from "./UIComponent";
import { UIRenderContext } from "./UIRenderContext";
import { UIMenuBuilder, UITheme } from "./UITheme";

/** Event that is emitted on a menu or menu item when it is selected. */
export class UIMenuItemSelectedEvent extends UIComponentEvent {
    constructor(name: string, source: UIComponent, key: string) {
        super(name, source);
        this.key = key;
    }

    /** The key of the menu item that was selected */
    readonly key: string;
}

/** Represents a menu that can be displayed on screen. The menu itself is built up dynamically using a platform dependent builder class. */
export class UIMenu extends Component {
    static preset(presets: UIMenu.Presets): Function {
        return super.preset(presets);
    }

    constructor() {
        super();
        if (!UITheme.current.MenuBuilder) {
            throw Error("[UIMenu] Menu builder not found");
        }
        this.builder = new UITheme.current.MenuBuilder();
        this.propagateChildEvents(e => {
            if (e instanceof UIComponentEvent) {
                if (e instanceof UIMenuItemSelectedEvent) {
                    this.selected = e.key;
                }
                return e;
            }
        });
    }

    /** Menu builder, can be used to build up the menu before it is displayed */
    readonly builder: UIMenuBuilder;

    /** Build the current menu and render it using `UIMenu.builder` */
    render(callback: UIRenderContext.RenderCallback) {
        if (this.options.length) {
            this.builder.clear();
            for (let option of this.options) {
                this.builder.addOption(option.key, option.text);
            }
        }
        if (this.gravity) this.builder.setGravity(this.gravity);
        this.propagateComponentEvent("Build");
        let Menu = this.builder.build();
        (this.menu = new Menu()).render(callback);
    }

    /** The last menu that was built, as a child object */
    @managedChild
    menu?: UIRenderable;

    /** Menu gravity in relation to reference component (start/stretch/end) */
    gravity?: "start" | "stretch" | "end";

    /** List of initial menu options; for advanced menus use `onBuild` to build the menu dynamically */
    options: Array<{ key: string, text: string }> = [];

    /** The key of the menu item that was last selected, if any */
    selected?: string;
}

export namespace UIMenu {
    /** UIMenu presets type, for use with `Component.with` */
    export interface Presets {
        /** List of menu options; for advanced menus use `onBuild` to build the menu dynamically */
        options: Array<{ key: string, text: string }>;
        /** Menu gravity in relation to reference component (start/stretch/end) */
        gravity: "start" | "stretch" | "end";
        /** Event handler that is invoked every time just before the menu is rendered */
        onBuild: UIComponentEventHandler<UIMenu>;
        /** Event handler that is invoked after a menu item has been picked */
        onSelectMenuItem: UIComponentEventHandler<UIMenu, UIMenuItemSelectedEvent>;
    }
}
