type list = {
    id: string,
    name: string,
    members: string[],
    owner: string,
}

const lists: list[] = localStorage.getItem('lists')
    ? JSON.parse(localStorage.getItem('lists'))
    : [];

export default function (name, did, owner) {
    const newList = {
        id: new Date().getTime().toString(),
        name: name,
        members: [did],
        owner: owner
    }

    const newLists = [...lists, newList];
    localStorage.setItem('lists', JSON.stringify(newLists));

    return newLists;
}