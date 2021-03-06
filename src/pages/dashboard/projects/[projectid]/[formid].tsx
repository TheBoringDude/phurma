import { Listbox, Transition } from '@headlessui/react';
import { DashLayout } from '@layouts/DashLayout';
import React, { Fragment, useState } from 'react';
import { SelectorIcon, CheckIcon } from '@heroicons/react/solid';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/dist/frontend';
import useSWR from 'swr';
import { useRouter } from 'next/router';
import { QueryManager } from '~types/query';
import { FormPropsById } from '~types/forms';
import { ResponseProps } from '~types/response';
import { FaunaResponseProps } from '@ootiq/just-faunautils';
import { PageCrumbs } from '@components/dashboard/page-crumbs';
import { MapResponse } from '@modules/responses/map-response';
import { SelectedResponse } from '@modules/responses/selected';
import { ErrorPageComponent } from '@components/error-page';
import { LoadingComponent } from '@components/loading';

// view mode for submissions
const viewSubmissionsMode = {
  all: 'All Submissions',
  verified: 'Verified Submissions',
  spam: 'Spam Submissions'
};

const FormPage = withPageAuthRequired(() => {
  const router = useRouter();
  const { projectid, formid } = router.query;

  const [selectView, setSelectView] = useState(viewSubmissionsMode.all);

  const [selected, setSelected] = useState<FaunaResponseProps<ResponseProps>>();

  const { data: form } = useSWR<QueryManager<FormPropsById>>(
    formid && `/api/user/projects/forms/${projectid}/${formid}`
  );

  // show loading if no data yet
  if (!form) return <LoadingComponent message="Loading form..." />;

  if (form?.error) {
    return <ErrorPageComponent code={form.code} title={form.description} />;
  }

  return (
    <DashLayout pageTitle={form ? form.data.form.name : 'Loading form...'}>
      {form && (
        <div>
          <PageCrumbs
            links={[
              { text: 'projects', href: '/dashboard/projects' },
              { text: form.data.project.name, href: `/dashboard/projects/${projectid}` },
              { text: form.data.form.name, href: `/dashboard/projects/${projectid}/${formid}` }
            ]}
          />

          {/* <p className="text-sm text-gray-500 tracking-wide">
            <Link href={`/dashboard/projects/${projectid}`}>
              <a>{form.data.project.name}</a>
            </Link>{' '}
            {'>'}{' '}
            <Link href={`/dashboard/projects/${projectid}/${formid}`}>
              <a>{form.data.form.name}</a>
            </Link>
          </p> */}

          <p className="text-gray-600 mt-6 mb-4">
            You form&apos;s project api url is{' '}
            <strong>{`${process.env.NEXT_PUBLIC_WEBSITE}/api/${form.data.form.id}`}</strong>
          </p>

          <div className="mt-8 mb-3 flex flex-col md:flex-row items-start md:items-center justify-between">
            <h4 className="text-xl font-bold tracking-wide">{form.data.form.name}</h4>
            <div className="w-72">
              <Listbox value={selectView} onChange={setSelectView}>
                {({ open }) => (
                  <>
                    <div className="relative mt-1">
                      <Listbox.Button className="relative w-full py-2 pl-3 pr-10 text-left bg-white border rounded-lg text-sm tracking-wide text-gray-700">
                        <span className="block truncate">{selectView}</span>
                        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                          <SelectorIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                        </span>
                      </Listbox.Button>
                      <Transition
                        show={open}
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                      >
                        <Listbox.Options
                          static
                          className="absolute w-full py-1 mt-1 overflow-auto text-base bg-white rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
                        >
                          {Object.entries(viewSubmissionsMode).map(([key, mode]) => (
                            <Listbox.Option
                              key={key}
                              className={({ active }) =>
                                `${active ? 'text-purple-900 bg-purple-100' : 'text-gray-900'}
                          cursor-default select-none relative py-2 pl-10 pr-4`
                              }
                              value={mode}
                            >
                              {({ selected, active }) => (
                                <>
                                  <span
                                    className={`${
                                      selected ? 'font-medium' : 'font-normal'
                                    } block truncate`}
                                  >
                                    {mode}
                                  </span>
                                  {selected ? (
                                    <span
                                      className={`${active ? 'text-purple-600' : 'text-purple-600'}
                                absolute inset-y-0 left-0 flex items-center pl-3`}
                                    >
                                      <CheckIcon className="w-5 h-5" aria-hidden="true" />
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </Listbox.Option>
                          ))}
                        </Listbox.Options>
                      </Transition>
                    </div>
                  </>
                )}
              </Listbox>
            </div>
          </div>
          <hr />

          <div className="grid grid-cols-4 gap-2 h-screen">
            <div className="col-span-1 border-r overflow-y-auto">
              <MapResponse
                responses={form.data.responses}
                selected={selected}
                setSelected={setSelected}
              />
            </div>
            <SelectedResponse
              selected={selected?.data}
              projectRefId={form.data.project.refid}
              projectId={form.data.project.id}
              setSelected={setSelected}
            />
          </div>
        </div>
      )}
    </DashLayout>
  );
});

export default FormPage;
