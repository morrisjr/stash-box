/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useState, useEffect, useRef } from "react";
import { useHistory, Link } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import cx from "classnames";
import { Button, Col, Form, InputGroup, Row, Table } from "react-bootstrap";

import { Scene_findScene as Scene } from "src/graphql/definitions/Scene";
import { Tags_queryTags_tags as Tag } from "src/graphql/definitions/Tags";
import {
  SceneUpdateInput,
  FingerprintEditInput,
  FingerprintAlgorithm,
  GenderEnum,
} from "src/graphql";
import { getUrlByType, createHref } from "src/utils";
import { ROUTE_SCENES, ROUTE_SCENE } from "src/constants/route";

import { GenderIcon, Icon } from "src/components/fragments";
import SearchField, {
  SearchType,
  PerformerResult,
} from "src/components/searchField";
import TagSelect from "src/components/tagSelect";
import StudioSelect from "src/components/studioSelect";
import EditImages from "src/components/editImages";

const nullCheck = (input: string | null) =>
  input === "" || input === "null" ? null : input;
const zeroCheck = (input: number | null) =>
  input === 0 || Number.isNaN(input) ? null : input;

const schema = yup.object({
  id: yup.string().defined(),
  title: yup.string().required("Title is required"),
  details: yup.string().trim(),
  date: yup
    .string()
    .transform(nullCheck)
    .matches(/^\d{4}-\d{2}-\d{2}$/, {
      excludeEmptyString: true,
      message: "Invalid date",
    })
    .nullable(),
  duration: yup.number().positive().transform(zeroCheck).nullable(),
  director: yup.string().trim().transform(nullCheck).nullable(),
  studio: yup
    .string()
    .typeError("Studio is required")
    .transform(nullCheck)
    .required("Studio is required"),
  studioURL: yup.string().url("Invalid URL").transform(nullCheck).nullable(),
  performers: yup
    .array()
    .of(
      yup
        .object({
          performerId: yup.string().required(),
          name: yup.string().required(),
          disambiguation: yup.string().nullable(),
          alias: yup.string().trim().transform(nullCheck).nullable(),
          gender: yup.string().oneOf(Object.keys(GenderEnum)).nullable(),
          deleted: yup.bool().required(),
        })
        .required()
    )
    .required(),
  fingerprints: yup
    .array()
    .of(
      yup.object({
        algorithm: yup
          .string()
          .oneOf(Object.keys(FingerprintAlgorithm))
          .required(),
        hash: yup.string().required(),
        duration: yup.number().min(1).required(),
        submissions: yup.number().default(1).required(),
        created: yup.string().required(),
        updated: yup.string().required(),
      })
    )
    .nullable(),
  tags: yup.array().of(yup.string().required()).nullable(),
  images: yup
    .array()
    .of(
      yup.object({
        id: yup.string().required(),
        url: yup.string().required(),
      })
    )
    .required(),
});

interface SceneFormData extends yup.Asserts<typeof schema> {}

interface SceneProps {
  scene: Scene;
  callback: (updateData: SceneUpdateInput) => void;
}

const SceneForm: React.FC<SceneProps> = ({ scene, callback }) => {
  const history = useHistory();
  const fingerprintHash = useRef<HTMLInputElement>(null);
  const fingerprintDuration = useRef<HTMLInputElement>(null);
  const fingerprintAlgorithm = useRef<HTMLSelectElement>(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SceneFormData>({
    resolver: yupResolver(schema),
    mode: "onBlur",
    defaultValues: {
      images: scene.images,
    },
  });
  const {
    fields: performerFields,
    append: appendPerformer,
    remove: removePerformer,
    update: updatePerformer,
  } = useFieldArray({
    control,
    name: "performers",
    keyName: "performerId",
  });

  const [fingerprints, setFingerprints] = useState<FingerprintEditInput[]>(
    scene.fingerprints.map((f) => ({
      hash: f.hash,
      algorithm: f.algorithm,
      duration: f.duration,
      submissions: f.submissions,
      updated: f.updated,
      created: f.created,
    }))
  );

  const [isChanging, setChange] = useState<number | undefined>();

  useEffect(() => {
    register("tags");
    register("fingerprints");
    setValue("fingerprints", fingerprints);
    setValue("tags", scene.tags ? scene.tags.map((tag) => tag.id) : []);
    setValue(
      "performers",
      scene.performers.map((p) => ({
        performerId: p.performer.id,
        name: p.performer.name,
        alias: p.as ?? "",
        gender: p.performer.gender,
        disambiguation: p.performer.disambiguation,
        deleted: p.performer.deleted,
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [register, setValue]);

  const onTagChange = (selectedTags: Tag[]) =>
    setValue(
      "tags",
      selectedTags.map((t) => t.id)
    );

  const onSubmit = (data: SceneFormData) => {
    const sceneData: SceneUpdateInput = {
      id: data.id,
      title: data.title,
      date: data.date,
      duration: data.duration,
      director: data.director,
      details: data.details,
      studio_id: data.studio,
      performers: (data.performers ?? []).map((performance) => ({
        performer_id: performance.performerId,
        as: performance.alias,
      })),
      image_ids: data.images.map((i) => i.id),
      fingerprints: (data?.fingerprints ?? []).map((f) => ({
        hash: f.hash,
        algorithm: f.algorithm as FingerprintAlgorithm,
        duration: f.duration,
        created: f.created,
        updated: f.updated,
        submissions: f.submissions,
      })),
      tag_ids: data.tags,
    };
    const urls = [];
    if (data.studioURL) urls.push({ url: data.studioURL, type: "STUDIO" });
    sceneData.urls = urls;

    callback(sceneData);
  };

  const addPerformer = (result: PerformerResult) => {
    appendPerformer({
      name: result.name,
      performerId: result.id,
      gender: result.gender,
      alias: "",
      disambiguation: result.disambiguation ?? undefined,
      deleted: result.deleted,
    });
  };

  const handleChange = (result: PerformerResult, index: number) => {
    setChange(undefined);
    const alias = performerFields[index].alias || performerFields[index].name;
    updatePerformer(index, {
      name: result.name,
      performerId: result.id,
      gender: result.gender,
      alias: alias === result.name ? "" : alias,
      disambiguation: result.disambiguation ?? undefined,
      deleted: result.deleted,
    });
  };

  const performerList = performerFields.map((p, index) => (
    <Form.Row className="performer-item d-flex" key={p.performerId}>
      <Form.Control
        type="hidden"
        defaultValue={p.performerId}
        {...register(`performers.${index}.performerId`)}
      />

      <Col xs={6}>
        <InputGroup className="flex-nowrap">
          <InputGroup.Prepend>
            <Button variant="danger" onClick={() => removePerformer(index)}>
              Remove
            </Button>
          </InputGroup.Prepend>
          <InputGroup.Prepend>
            {isChanging === index ? (
              <Button variant="primary" onClick={() => setChange(undefined)}>
                Cancel
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setChange(index)}>
                Change
              </Button>
            )}
          </InputGroup.Prepend>
          <InputGroup.Append className="flex-grow-1">
            {isChanging === index ? (
              <SearchField
                onClick={(res) =>
                  res.__typename === "Performer" && handleChange(res, index)
                }
                searchType={SearchType.Performer}
              />
            ) : (
              <InputGroup.Text className="flex-grow-1 text-left text-truncate">
                <GenderIcon gender={p.gender} />
                <span className="performer-name text-truncate">
                  <b>{p.name}</b>
                  {p.disambiguation && (
                    <small className="ml-1">({p.disambiguation})</small>
                  )}
                </span>
              </InputGroup.Text>
            )}
          </InputGroup.Append>
        </InputGroup>
      </Col>

      <Col xs={{ span: 5, offset: 1 }}>
        <InputGroup>
          <InputGroup.Prepend>
            <InputGroup.Text>Scene Alias</InputGroup.Text>
          </InputGroup.Prepend>
          <Form.Control
            className="performer-alias"
            defaultValue={p.alias ?? ""}
            placeholder={p.name}
            {...register(`performers.${index}.alias`)}
          />
        </InputGroup>
      </Col>
    </Form.Row>
  ));

  const addFingerprint = () => {
    if (
      !fingerprintHash.current ||
      !fingerprintAlgorithm.current ||
      !fingerprintDuration.current
    )
      return;
    const hash = fingerprintHash.current.value?.trim();
    const algorithm = fingerprintAlgorithm.current
      .value as FingerprintAlgorithm;
    const duration =
      Number.parseInt(fingerprintDuration.current.value?.trim(), 10) ?? 0;
    if (
      !algorithm ||
      !hash ||
      !duration ||
      fingerprints.some((f) => f.hash === hash) ||
      hash === ""
    )
      return;
    const newFingerprints = [
      ...fingerprints,
      {
        hash,
        algorithm,
        duration,
        submissions: 1,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    ];
    setFingerprints(newFingerprints);
    setValue("fingerprints", newFingerprints);
    fingerprintHash.current.value = "";
    fingerprintDuration.current.value = "";
  };
  const removeFingerprint = (hash: string) => {
    const newFingerprints = fingerprints.filter((f) => f.hash !== hash);
    setFingerprints(newFingerprints);
    setValue("fingerprints", newFingerprints);
  };

  const renderFingerprints = () => {
    const fingerprintList = fingerprints.map((f) => (
      <tr key={f.hash}>
        <td>
          <button
            className="remove-item"
            type="button"
            onClick={() => removeFingerprint(f.hash)}
          >
            <Icon icon="times-circle" />
          </button>
        </td>
        <td>{f.algorithm}</td>
        <td>{f.hash}</td>
        <td>{f.duration}</td>
        <td>{f.submissions}</td>
        <td>{f.created.slice(0, 10)}</td>
        <td>{f.updated.slice(0, 10)}</td>
      </tr>
    ));

    return fingerprints.length > 0 ? (
      <Table size="sm">
        <thead>
          <tr>
            <th />
            <th>Algorithm</th>
            <th>Hash</th>
            <th>Duration</th>
            <th>Submissions</th>
            <th>First Submitted</th>
            <th>Last Submitted</th>
          </tr>
        </thead>
        <tbody>{fingerprintList}</tbody>
      </Table>
    ) : (
      <div>No fingerprints found for this scene.</div>
    );
  };

  return (
    <Form className="SceneForm" onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" value={scene.id} {...register("id")} />
      <Row>
        <Col xs={10}>
          <Form.Row>
            <Form.Group controlId="title" className="col-8">
              <Form.Label>Title</Form.Label>
              <Form.Control
                as="input"
                className={cx({ "is-invalid": errors.title })}
                type="text"
                placeholder="Title"
                defaultValue={scene?.title ?? ""}
                {...register("title", { required: true })}
              />
              <Form.Control.Feedback type="invalid">
                {errors?.title?.message}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group controlId="date" className="col-2">
              <Form.Label>Date</Form.Label>
              <Form.Control
                as="input"
                className={cx({ "is-invalid": errors.date })}
                type="text"
                placeholder="YYYY-MM-DD"
                defaultValue={scene.date}
                {...register("date")}
              />
              <Form.Control.Feedback type="invalid">
                {errors?.date?.message}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group controlId="duration" className="col-2">
              <Form.Label>Duration</Form.Label>
              <Form.Control
                as="input"
                className={cx({ "is-invalid": errors.duration })}
                type="number"
                placeholder="Duration"
                defaultValue={scene?.duration ?? ""}
                {...register("duration")}
              />
              <Form.Control.Feedback type="invalid">
                {errors?.duration?.message}
              </Form.Control.Feedback>
            </Form.Group>
          </Form.Row>

          <Form.Row>
            <Form.Group className="col">
              <Form.Label>Performers</Form.Label>
              {performerList}
              <div className="add-performer">
                <span>Add performer:</span>
                <SearchField
                  onClick={(res) =>
                    res.__typename === "Performer" && addPerformer(res)
                  }
                  searchType={SearchType.Performer}
                />
              </div>
            </Form.Group>
          </Form.Row>

          <Form.Row>
            <Form.Group controlId="studioId" className="studio-select col-6">
              <Form.Label>Studio</Form.Label>
              <StudioSelect initialStudio={scene.studio} control={control} />
              <Form.Control.Feedback type="invalid">
                {errors?.studio?.message}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group controlId="studioURL" className="col-6">
              <Form.Label>Studio URL</Form.Label>
              <Form.Control
                as="input"
                className={cx({ "is-invalid": errors.studioURL })}
                type="url"
                defaultValue={getUrlByType(scene.urls, "STUDIO")}
                {...register("studioURL")}
              />
              <Form.Control.Feedback type="invalid">
                {errors?.studioURL?.message}
              </Form.Control.Feedback>
            </Form.Group>
          </Form.Row>

          <Form.Row>
            <Form.Group controlId="details" className="col">
              <Form.Label>Details</Form.Label>
              <Form.Control
                as="textarea"
                className="description"
                placeholder="Details"
                defaultValue={scene?.details ?? ""}
                {...register("details")}
              />
            </Form.Group>
          </Form.Row>

          <Form.Row>
            <Form.Group controlId="director" className="col-4">
              <Form.Label>Director</Form.Label>
              <Form.Control
                as="input"
                className={cx({ "is-invalid": errors.director })}
                type="text"
                placeholder="Director"
                defaultValue={scene?.director ?? ""}
                {...register("director")}
              />
              <Form.Control.Feedback type="invalid">
                {errors?.director?.message}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="col-8" />
          </Form.Row>

          <Form.Group>
            <Form.Label>Tags</Form.Label>
            <TagSelect tags={scene.tags} onChange={onTagChange} />
          </Form.Group>

          <Form.Group>
            <Form.Label>Images</Form.Label>
            <EditImages control={control} maxImages={1} />
          </Form.Group>

          <Form.Group>
            <Form.Label>Fingerprints</Form.Label>
            {renderFingerprints()}
          </Form.Group>

          <Form.Group className="add-fingerprint row">
            <Form.Label htmlFor="hash" column>
              Add fingerprint:
            </Form.Label>
            <Form.Control
              id="algorithm"
              as="select"
              className="col-2 mr-1"
              ref={fingerprintAlgorithm}
            >
              {Object.keys(FingerprintAlgorithm).map((f) => (
                <option value={f}>{f}</option>
              ))}
            </Form.Control>
            <Form.Control
              id="hash"
              placeholder="Hash"
              className="col-3 mr-2"
              ref={fingerprintHash}
            />
            <Form.Control
              id="duration"
              placeholder="Duration"
              type="number"
              className="col-2 mr-2"
              ref={fingerprintDuration}
            />
            <Button
              className="col-2 add-performer-button"
              onClick={addFingerprint}
            >
              Add
            </Button>
          </Form.Group>

          <Form.Group className="row">
            <Col>
              <Button type="submit">Save</Button>
            </Col>
            <Button type="reset" variant="secondary" className="ml-auto">
              Reset
            </Button>
            <Link
              to={createHref(scene.id ? ROUTE_SCENE : ROUTE_SCENES, scene)}
              className="ml-2"
            >
              <Button variant="danger" onClick={() => history.goBack()}>
                Cancel
              </Button>
            </Link>
          </Form.Group>
        </Col>
      </Row>
    </Form>
  );
};

export default SceneForm;
