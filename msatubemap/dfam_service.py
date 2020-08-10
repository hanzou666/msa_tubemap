from dataclasses import dataclass
from dataclasses_json import dataclass_json
import json
from typing import List

import requests

@dataclass_json
@dataclass(frozen=True)
class Annotation:
    name: str
    url: str


@dataclass_json
@dataclass(frozen=True)
class AnnotationResultSet:
    annotations: List[Annotation]
    count: int

    @classmethod
    def build(cls, annotations: List[Annotation]):
        return cls(annotations=annotations, count=len(annotations))


@dataclass_json
@dataclass(frozen=True)
class AnnotationErrorResultSet:
    error_code: int
    error_message: str

    @classmethod
    def default(cls):
        return cls(error_code=1, error_message='species field is empty')


def get(species=None, words=None):
    query_params = []
    if species is not None:
        query_params.append(f"clade={species}")
    if words is not None:
        query_params.append(f"keywords={words}")
    response = requests.get(f"https://dfam.org/api/families?{'&'.join(query_params)}")
    if response.status_code == requests.codes.ok:
        results = json.loads(response.text)["results"]
        print(results)
        annotations = [Annotation(name=result["name"], url=f"https://dfam.org/family/{result['accession']}/summary") for result in results]
        return AnnotationResultSet.build(annotations)
    return AnnotationErrorResultSet(error_code=response.status_code, error_message=response.text)

