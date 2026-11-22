const card = (title: string, detail: string, deadline: string): TodoCard => ({
    title,
    detail: detail.trim(),
    deadline,
});

const toCard = (item: RawCard): TodoCard => card(item.title ?? item.text ?? "", item.detail ?? "", item.deadline ?? "");

export interface RawCard {
    title?: string;
    text?: string;
    detail?: string;
    deadline?: string;
}

export interface RawLists {
    important?: RawCard[];
    items?: RawCard[];
    pending?: RawCard[];
    ongoing?: RawCard[];
    reviewing?: RawCard[];
}

export type RawTodo = RawLists | null;

export interface TodoCard {
    title: string;
    detail: string;
    deadline: string;
}

export interface TodoLists {
    pending: TodoCard[];
    ongoing: TodoCard[];
    reviewing: TodoCard[];
}

export const normalize = (data: RawTodo): TodoLists => {
    const old = [...(data?.important ?? []), ...(data?.items ?? [])];
    return {
        pending: [...old, ...(data?.pending ?? [])].map(toCard),
        ongoing: (data?.ongoing ?? []).map(toCard),
        reviewing: (data?.reviewing ?? []).map(toCard),
    };
};
