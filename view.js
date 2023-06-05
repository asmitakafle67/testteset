import React, { useState, useEffect } from "react";
import LayoutComponent from "../../shared/LayoutComponent";

import { useQuery } from "react-query";
import { useForm } from "react-hook-form";
import FooterComponent from "../../shared/FooterComponent";
import ReactPaginate from "react-paginate";
import Modal from "react-bootstrap/Modal";
import { useQueryClient } from "react-query";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { CSVLink } from "react-csv";
import { Link } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Dropdown from "react-bootstrap/Dropdown";
import api from "../../api";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

import apiService from "../../service/service";
import { useContext } from "react";
import ExchangeApiContext from "../../context/Exchangecontext/exchangeapicontext";

const ViewAdminUser = () => {
  const context = useContext(ExchangeApiContext);
  const { loggedin_user_email } = context;
  const queryClient = useQueryClient();

  // modal
  const [showUpdateCapacityModal, setShowUpdateCapacityModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [userdata, setuserData] = useState([]);
  const [payasyougo, setPayAsYouGo] = useState([]);
  const [currentCapacityValue, setCurrentCapacityValue] = useState();
  const [currentemail, setCurrentemail] = useState();
  const [currentDisplayName, setCurrentDisplayName] = useState();
  const [currentIsGroupAdmin, setCurrentIsGroupAdmin] = useState();
  const [currentIsAccountActive, setCurrentIsAccountActive] = useState();
  const [currentBucketCapacity, setCurrentBucketCapacity] = useState();
  const [isLoading, setIsLoading] = useState(true);
  const [postsPerPage] = useState(6);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState("All");
  const [filteredData, setFilteredData] = useState([]);

  const handleCloseUserModal = () => {
    setCurrentBucketCapacity("");
    setCurrentCapacityValue("");
    setCurrentIsGroupAdmin(false);
    setCurrentIsAccountActive(false);
    setShowEditUserModal(false);
  };
  const csvFilename = "myUserData.csv";

  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  const currentUser = filteredData.slice(indexOfFirstPost, indexOfLastPost);
  const paginate = ({ selected }) => {
    setCurrentPage(selected + 1);
  };
  const params = {
    user: loggedin_user_email,
  };
  useQuery("userData", async () => {
    try {
      const response = await api.get(`/view`, {
        params,
      });
      // console.log(response.data);
      const clientAdminData = JSON.parse(response.data.body);
      setuserData(clientAdminData);
      setPayAsYouGo(clientAdminData.is_pay_as_you_go);
      console.log(clientAdminData);

      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  });

  const schema = yup.object().shape({
    currentBucketCapacity: yup
      .string()
      .required("bucket Capacity is required")
      .matches(/^(0|[1-9]\d*)$/, "Bucket capacity must be a positive number"),

    currentCapacityValue: yup
      .string()
      .required("User Capacity is required")
      .matches(/^(0|[1-9]\d*)$/, "User capacity must be a positive number")
      .test(
        "lessThanBucketCapacity",
        "User capacity should be less than bucket capacity",
        function (value) {
          const bucketCapacity = parseInt(this.parent.currentBucketCapacity);
          const userCapacity = parseInt(value);
          return userCapacity <= bucketCapacity;
        }
      ),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const showSubmit = (
    host_email,

    user_capacity,
    is_account_active,
    is_partner_admin,
    bucket_capacity_in_gb
  ) => {
    // setGlobalEditData({
    //   host_email: host_email,
    //   // parent_id: loggedInEmail,
    // });
    setCurrentCapacityValue(user_capacity);
    setCurrentemail(host_email);
    setCurrentIsAccountActive(is_account_active);
    setCurrentIsGroupAdmin(is_partner_admin);
    setCurrentBucketCapacity(bucket_capacity_in_gb);

    setShowEditUserModal(true);
  };

  const handleEditSubmit = () => {
    const postData = {
      email: currentemail,
      display_name: "test",
      is_group_admin: currentIsGroupAdmin,
      user_capacity: currentCapacityValue,
      is_account_active: currentIsAccountActive,
      bucket_capacity: currentBucketCapacity,
    };

    const param1 = {
      loggedInUser: loggedin_user_email,
    };

    console.log(postData);
    api
      .put(`/update-user/${currentemail}`, postData, {
        params: param1,
      })
      .then(function (response) {
        toast.success("Update successful!", {
          position: toast.POSITION.TOP_RIGHT,
          autoClose: 1000,
        });
        console.log(response);
        // setGlobalEditData(response.data);
        queryClient.invalidateQueries("userData");

        setShowEditUserModal(false); // close modal after successful submission
        reset();
      })
      .catch(function (error) {
        toast.error("Failed to update user detail!", {
          position: toast.POSITION.TOP_RIGHT,
          autoClose: 1000,
        });
        console.log(error);
      });
  };
  const modifiedData = userdata.map((item) => {
    return {
      "Bucket Capacity (GB)": item.bucket_capacity_in_gb,
      "Bucket Name": item.bucket_name,
      Group: item.group,
      Email: item.host_email,
      "Is group Admin": item.is_group_admin,
      "Is Account Active ": item.is_account_active,
      "Is Partner Admin": item.is_partner_admin,
      "Is Pay As You GO": item.is_pay_as_you_go,
      "Is Super Admin": item.is_super_admin,
      "Parent Id": item.parent_id,
      "User Capacity": item.user_capacity,
    };
  });

  const deleteUser = (host_email) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#10485aff",
      confirmButtonText: "Delete",
    }).then((result) => {
      if (result.isConfirmed) {
        api
          .delete("/delete-user", {
            data: {
              admin_email: loggedin_user_email,
              delete_email: host_email,
            },
          })
          .then(() => {
            Swal.fire("Deleted!", "User has been deleted.", "success");

            queryClient.invalidateQueries("userData");
          })
          .catch((error) => {
            // Handle error
          });
      }
    });
  };
  // Get unique group names

  useEffect(() => {
    if (selectedGroup === "All") setFilteredData(userdata);
    else {
      const filteredData = userdata.filter(
        (filterData) => filterData.group === selectedGroup
      );
      setFilteredData(filteredData);
    }
  }, [selectedGroup, userdata]);
  const handleGroupSelection = (groupp) => {
    setSelectedGroup(groupp);
    setCurrentPage(1); // Reset the current page to 1

    console.log(selectedGroup);
  };

  const uniqueGroupNames = [
    ...new Set(userdata.map((groupType) => groupType.group)),
  ];

  return (
    <LayoutComponent>
      <div className="table-content pt-6">
        <div className="container">
          <div className="table-header pb-1">
            <div className="d-flex align-items-center">
              <Dropdown>
                <Dropdown.Toggle className=" group-filter" variant="outline">
                  <i className="filter-icon bi bi-funnel"></i>
                  <span className="mx-2"> Select Group</span>
                </Dropdown.Toggle>
                <Dropdown.Menu className="dropdown-text-size">
                  <Dropdown.Item onClick={() => handleGroupSelection("All")}>
                    All
                  </Dropdown.Item>
                  {uniqueGroupNames.map((group) => (
                    <Dropdown.Item
                      key={group}
                      onClick={() => handleGroupSelection(group)}
                    >
                      {group}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>

              <h4 className="card-title align-items-start flex-column">
                <span className="card-label fw-bold fs-3 mb-1">
                  {/* Request History */}
                </span>
              </h4>
            </div>
            <div className="card-toolbar">
              <CSVLink
                data={modifiedData}
                filename={csvFilename}
                className="btn btn-sm btn-primary"
              >
                <span className="svg-icon svg-icon-2"></span>{" "}
                <i className="bi bi-download"></i>
                <span className="mx-2"> Export</span>
              </CSVLink>
            </div>
          </div>

          {/* start table */}
          <div className="table-responsive pt-3">
            <table className="table pt-5">
              <thead className="table-color pt-5">
                <tr>
                  <th className="min-w-30px" scope="col">
                    Host Email
                  </th>
                  <th className="text-nowrap min-w-30px " scope="col">
                    Bucket Capacity(GB)
                  </th>
                  <th className="min-w-30px" scope="col">
                    Group
                  </th>

                  <th className="min-w-30px" scope="col">
                    Admin Email
                  </th>
                  <th className="text-nowrap min-w-30px" scope="col">
                    User Capacity(GB)
                  </th>
                  <th
                    className="min-w-30px text-center"
                    scope="col"
                    colSpan={3}
                  >
                    Action{" "}
                  </th>
                </tr>
              </thead>
              {isLoading ? (
                <p>Loading...</p>
              ) : (
                <>
                  {currentUser.map((userDataa) => (
                    <tbody>
                      <tr>
                        <td>{userDataa.host_email}</td>
                        <td>{userDataa.bucket_capacity_in_gb}</td>
                        <td>{userDataa.group}</td>

                        <td>{userDataa.parent_id}</td>
                        <td>{userDataa.user_capacity}</td>
                        <td>
                          <Link
                            className={`update-icon icon-with-space`}
                            data-tooltip-id="my-tooltip"
                            data-tooltip-content="Edit User Detail"
                            onClick={() =>
                              showSubmit(
                                userDataa.host_email,

                                userDataa.user_capacity,

                                userDataa.is_account_active,
                                userDataa.is_partner_admin,
                                userDataa.bucket_capacity_in_gb
                              )
                            }
                          >
                            <i className="fa-sharp fa-solid fa-pen"></i>
                          </Link>
                        </td>
                        {/* <td>
                            <Link
                              className={`update-icon icon-with-space`}
                              onClick={() =>
                                showSubmit(
                                  userDataa.host_email,
                                  userDataa.user_capacity
                                )
                              }
                              data-tooltip-id="my-tooltip"
                              data-tooltip-content="Update Capacity"
                            >
                              <i className="fa-solid fa-bucket"></i>
                            </Link>
                          </td> */}
                        <td>
                          <Link
                            className={`delete-icon icon-with-space`}
                            data-tooltip-id="my-tooltip"
                            data-tooltip-content="Delete User"
                            onClick={() => deleteUser(userDataa.host_email)}
                          >
                            <i className="fa-solid fa-trash"></i>
                          </Link>
                        </td>
                      </tr>
                    </tbody>
                  ))}
                </>
              )}
            </table>
          </div>
          <div className="table-header pt-3 pb-3">
            <p className="text-lgt align-items-start flex-column">
              {/* <span className="card-label mb-1">
            Showing 1 to 10 of 50 entries
          </span> */}
            </p>

            {filteredData ? (
              <div className="card-toolbar">
                {/* ... */}
                <ReactPaginate
                  onPageChange={paginate}
                  pageCount={Math.ceil(filteredData.length / postsPerPage)}
                  previousLabel={"Prev"}
                  nextLabel={"Next"}
                  containerClassName={"pagination"}
                  pageLinkClassName={"page-number"}
                  previousLinkClassName={"page-number"}
                  nextLinkClassName={"page-number"}
                  activeLinkClassName={"active"}
                />
              </div>
            ) : (
              <div className="loading">Loading..</div>
            )}
          </div>
          <div className="table-header pt-3 pb-3">
            <p className="text-lgt align-items-start flex-column"></p>
          </div>
        </div>
      </div>
      {/*Edit user detail Modal*/}

      <Modal show={showEditUserModal} onHide={handleCloseUserModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            <div
              variant="btn btn-sm btn-primary"
              onClick={handleCloseUserModal}
            >
              <h5>Edit User Detail</h5>
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="border-none px-4">
          <form>
            <div className="profile-form">
              <div className="mb-3">
                <label htmlFor="formGroupExampleInput" className="form-label">
                  Email
                </label>
                <input
                  type="email"
                  className="form-control"
                  placeholder=""
                  required
                  name="email"
                  value={currentemail}
                />
              </div>
              {/* <div className="mb-3">
                <label htmlFor="formGroupExampleInput" className="form-label">
                  Display Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder=""
                  required
                  name="display_name"
                  value={currentDisplayName}
                  onChange={(e) => setCurrentDisplayName(e.target.value)}
                />
              </div> */}

              <div className="mb-3">
                <label htmlFor="formGroupExampleInput" className="form-label">
                  Bucket Capacity(GB)
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder=""
                  required
                  name="currentBucketCapacity"
                  value={currentBucketCapacity}
                  {...register("currentBucketCapacity", {
                    required: true,

                    onChange: (e) => setCurrentBucketCapacity(e.target.value),
                  })}
                  disabled={currentBucketCapacity === "0"}
                />
                {errors.currentBucketCapacity && (
                  <span className="text-danger">
                    {errors.currentBucketCapacity.message}
                  </span>
                )}
              </div>
              <div className="mb-3">
                <label htmlFor="formGroupExampleInput" className="form-label">
                  User Capacity(GB)
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder=""
                  required
                  name="currentCapacityValue"
                  value={currentCapacityValue}
                  {...register("currentCapacityValue", {
                    required: true,

                    onChange: (e) => setCurrentCapacityValue(e.target.value),
                  })}
                  disabled={currentCapacityValue === "0"}
                />
                {errors.currentCapacityValue && (
                  <span className="text-danger">
                    {errors.currentCapacityValue.message}
                  </span>
                )}
              </div>

              {/* <div className="mb-3">
                <label htmlFor="formGroupExampleInput" className="form-label">
                  User Capacity
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder=""
                  required
                  name="user_capacity"
                  value={currentCapacityValue}
                  onChange={(e) => {
                    const inputValue = e.target.value.replace(/\D/g, "");
                    setCurrentCapacityValue(inputValue);
                  }}
                  disabled={currentCapacityValue === "0"}
                /> */}
              {/* {currentCapacityValue > currentBucketCapacity && (
                  <div className="text-danger">
                    "User Capacity cannot exceed Bucket Capacity"
                  </div>
                )} */}
              {/* <div className="text-danger">
                  {currentCapacityValue > currentBucketCapacity &&
                    "User Capacity cannot exceed Bucket Capacity"}
                  {!currentCapacityValue && "User Capacity is required"}
                </div> */}
              {/* {errors.currentCapacityValue && (
                  <span className="text-danger">
                    {errors.currentCapacityValue.message}
                  </span>
                )}
              </div> */}

              <div className="mb-3 form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="exampleCheck1"
                  name="is_group_admin"
                  checked={currentIsGroupAdmin}
                  onChange={(e) => setCurrentIsGroupAdmin(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="exampleCheck1">
                  Partner Admin
                </label>
              </div>
              <div className="mb-3 form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="exampleCheck2"
                  name="is_account_active"
                  checked={currentIsAccountActive}
                  onChange={(e) => setCurrentIsAccountActive(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="exampleCheck2">
                  Account Active
                </label>
              </div>
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="btn btn-sm secondary" onClick={handleCloseUserModal}>
            Cancel
          </Button>
          <Button
            variant="btn btn-sm btn-primary"
            onClick={handleSubmit(handleEditSubmit)}
            disabled={!currentCapacityValue || !currentBucketCapacity}
          >
            Save
          </Button>
        </Modal.Footer>
      </Modal>

      <FooterComponent />
    </LayoutComponent>
  );
};

export default ViewAdminUser;
