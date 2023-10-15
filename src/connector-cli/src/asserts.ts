import * as Media from '@chili-publish/studio-connectors/types/MediaConnector'

export function assertResult(testResult: unknown, method: string) {

    switch (method) {
        case 'download':
            assertDownloadResult(testResult)
            break;
        case 'detail':
            assertDetailResult(testResult)
            break;
        case 'query':
            assertQueryResult(testResult)
            break;
    }
}

export function assertQueryResult(testResult: unknown) {
    var r = testResult as Media.MediaPage;

    if (r.data === undefined) {
        console.log("query assert failed, 'data' property undefined", r)
        return;
    }

    if (r.pageSize === undefined) {
        console.log("query assert failed, 'pageSize' property undefined", r)
        return;
    }

    for (const media of r.data) {

        if (media.id === undefined) {
            console.log("query assert failed, 'id' property undefined", media)
            return;
        }

        if (media.name === undefined) {
            console.log("query assert failed, 'name' property undefined", media)
            return;
        }

        if (media.relativePath === undefined) {
            console.log("query assert failed, 'relativePath' property undefined", media)
            return;
        }

        if (media.type === undefined) {
            console.log("query assert failed, 'type' property undefined", media)
            return;
        }

    }

    console.log("query assert passed", r)
}

export function assertDetailResult(testResult: unknown) {
}

export function assertDownloadResult(testResult: unknown) {

}
