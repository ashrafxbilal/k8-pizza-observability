package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-logr/logr"
	corev1 "k8s.io/api/core/v1"
	kErr "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/config"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"
)

// Define the PizzaOrder types
type Address struct {
	Street     string `json:"street"`
	City       string `json:"city"`
	Region     string `json:"region"`
	PostalCode string `json:"postalCode"`
	Phone      string `json:"phone"`
}

type Customer struct {
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Email     string `json:"email"`
}

type Pizza struct {
	Size     string   `json:"size"`
	Toppings []string `json:"toppings"`
}

type StoreStatus struct {
	ID      string `json:"id,omitempty"`
	Address string `json:"address,omitempty"`
}

type Tracker struct {
	Prep           string `json:"prep,omitempty"`
	Bake           string `json:"bake,omitempty"`
	QualityCheck   string `json:"qualityCheck,omitempty"`
	OutForDelivery string `json:"outForDelivery,omitempty"`
	Delivered      string `json:"delivered,omitempty"`
}

type PizzaOrderSpec struct {
	PlaceOrder    bool                        `json:"placeOrder"`
	Address       *Address                    `json:"address"`
	Customer      *Customer                   `json:"customer"`
	PaymentSecret corev1.LocalObjectReference `json:"paymentSecret,omitempty"`
	Pizzas        []*Pizza                    `json:"pizzas"`
}

type PizzaOrderStatus struct {
	OrderID   string       `json:"orderID,omitempty"`
	Price     string       `json:"price,omitempty"`
	Placed    bool         `json:"placed,omitempty"`
	Delivered bool         `json:"delivered,omitempty"`
	Store     *StoreStatus `json:"store,omitempty"`
	Tracker   *Tracker     `json:"tracker,omitempty"`
}

type PizzaOrder struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`
	Spec              PizzaOrderSpec   `json:"spec,omitempty"`
	Status            PizzaOrderStatus `json:"status,omitempty"`
}

type PizzaOrderList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []PizzaOrder `json:"items"`
}

func (in *PizzaOrder) DeepCopyInto(out *PizzaOrder) {
	*out = *in
	out.TypeMeta = in.TypeMeta
	in.ObjectMeta.DeepCopyInto(&out.ObjectMeta)

	// Deep copy spec
	out.Spec = PizzaOrderSpec{
		PlaceOrder:    in.Spec.PlaceOrder,
		PaymentSecret: in.Spec.PaymentSecret,
	}

	if in.Spec.Address != nil {
		out.Spec.Address = &Address{
			Street:     in.Spec.Address.Street,
			City:       in.Spec.Address.City,
			Region:     in.Spec.Address.Region,
			PostalCode: in.Spec.Address.PostalCode,
			Phone:      in.Spec.Address.Phone,
		}
	}

	if in.Spec.Customer != nil {
		out.Spec.Customer = &Customer{
			FirstName: in.Spec.Customer.FirstName,
			LastName:  in.Spec.Customer.LastName,
			Email:     in.Spec.Customer.Email,
		}
	}

	if len(in.Spec.Pizzas) > 0 {
		out.Spec.Pizzas = make([]*Pizza, len(in.Spec.Pizzas))
		for i, pizza := range in.Spec.Pizzas {
			out.Spec.Pizzas[i] = &Pizza{
				Size: pizza.Size,
			}
			if len(pizza.Toppings) > 0 {
				out.Spec.Pizzas[i].Toppings = make([]string, len(pizza.Toppings))
				copy(out.Spec.Pizzas[i].Toppings, pizza.Toppings)
			}
		}
	}

	// Deep copy status
	out.Status = PizzaOrderStatus{
		OrderID:   in.Status.OrderID,
		Price:     in.Status.Price,
		Placed:    in.Status.Placed,
		Delivered: in.Status.Delivered,
	}

	if in.Status.Store != nil {
		out.Status.Store = &StoreStatus{
			ID:      in.Status.Store.ID,
			Address: in.Status.Store.Address,
		}
	}

	if in.Status.Tracker != nil {
		out.Status.Tracker = &Tracker{
			Prep:           in.Status.Tracker.Prep,
			Bake:           in.Status.Tracker.Bake,
			QualityCheck:   in.Status.Tracker.QualityCheck,
			OutForDelivery: in.Status.Tracker.OutForDelivery,
			Delivered:      in.Status.Tracker.Delivered,
		}
	}
}

// DeepCopy creates a deep copy of a PizzaOrder
func (in *PizzaOrder) DeepCopy() *PizzaOrder {
	if in == nil {
		return nil
	}
	out := new(PizzaOrder)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyObject creates a deep copy of an object
func (in *PizzaOrder) DeepCopyObject() runtime.Object {
	if in == nil {
		return nil
	}
	return in.DeepCopy()
}

func (in *PizzaOrderList) DeepCopyInto(out *PizzaOrderList) {
	*out = *in
	out.TypeMeta = in.TypeMeta
	in.ListMeta.DeepCopyInto(&out.ListMeta)

	if len(in.Items) > 0 {
		out.Items = make([]PizzaOrder, len(in.Items))
		for i := range in.Items {
			in.Items[i].DeepCopyInto(&out.Items[i])
		}
	}
}

func (in *PizzaOrderList) DeepCopy() *PizzaOrderList {
	if in == nil {
		return nil
	}
	out := new(PizzaOrderList)
	in.DeepCopyInto(out)
	return out
}

func (in *PizzaOrderList) DeepCopyObject() runtime.Object {
	if in == nil {
		return nil
	}
	return in.DeepCopy()
}

// Dominos API types
type DominosAddress struct {
	Street       string   `json:"Street"`
	City         string   `json:"City"`
	Region       string   `json:"Region"`
	PostalCode   string   `json:"PostalCode"`
	Type         string   `json:"Type,omitempty"`
	AddressLines []string `json:"AddressLines,omitempty"`
}

type DominosStore struct {
	StoreID         string  `json:"StoreID"`
	Address         string  `json:"AddressDescription"`
	IsOpen          bool    `json:"IsOpen"`
	MinDistance     float64 `json:"MinDistance"`
	IsDeliveryStore bool    `json:"IsDeliveryStore"`
	IsOnlineCapable bool    `json:"IsOnlineCapable"`
	ServiceIsOpen   struct {
		Delivery bool `json:"Delivery"`
		Carryout bool `json:"Carryout"`
	} `json:"ServiceIsOpen"`
}

type DominosStoreResponse struct {
	Stores []DominosStore `json:"Stores"`
}

type DominosOrderProduct struct {
	Code    string                       `json:"Code"`
	Qty     int                          `json:"Qty"`
	Options map[string]map[string]string `json:"Options,omitempty"`
}

type DominosPayment struct {
	Type         string  `json:"Type"`
	Amount       float64 `json:"Amount"`
	Number       string  `json:"Number,omitempty"`
	Expiration   string  `json:"Expiration,omitempty"`
	SecurityCode string  `json:"SecurityCode,omitempty"`
	PostalCode   string  `json:"PostalCode,omitempty"`
	TipAmount    float64 `json:"TipAmount,omitempty"`
}

type DominosOrder struct {
	Address  DominosAddress        `json:"Address"`
	Customer map[string]string     `json:"Customer"`
	StoreID  string                `json:"StoreID"`
	Products []DominosOrderProduct `json:"Products"`
	Payments []DominosPayment      `json:"Payments,omitempty"`
	OrderID  string                `json:"OrderID,omitempty"`
	Price    float64               `json:"Price,omitempty"`
}

type DominosTracker struct {
	AsOfTime         string `json:"AsOfTime"`
	StoreID          string `json:"StoreID"`
	OrderID          string `json:"OrderID"`
	OrderDescription string `json:"OrderDescription"`
	StoreOrderID     string `json:"StoreOrderID"`
	OrderStatus      int    `json:"OrderStatus"`
	StartTime        string `json:"StartTime,omitempty"`
	Prep             string `json:"Prep,omitempty"`
	Bake             string `json:"Bake,omitempty"`
	QualityCheck     string `json:"QualityCheck,omitempty"`
	OutForDelivery   string `json:"OutForDelivery,omitempty"`
	Delivered        string `json:"Delivered,omitempty"`
}

// PizzaOrderReconciler reconciles a PizzaOrder object
type PizzaOrderReconciler struct {
	client client.Client
	Log    logr.Logger
	Scheme *runtime.Scheme
}

// +kubebuilder:rbac:groups=pizza.bilalashraf.xyz,resources=pizzaorders,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=pizza.bilalashraf.xyz,resources=pizzaorders/status,verbs=get;update;patch
// +kubebuilder:rbac:groups="",resources=secrets,verbs=get;list;watch

func (r *PizzaOrderReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	log := r.Log.WithValues("pizzaorder", req.NamespacedName)

	// Fetch the PizzaOrder instance
	pizzaOrder := &PizzaOrder{}
	if err := r.client.Get(ctx, req.NamespacedName, pizzaOrder); err != nil {
		if kErr.IsNotFound(err) {
			return ctrl.Result{}, nil
		}
		return ctrl.Result{}, err
	}

	// Update status at the end
	defer func() {
		statusErr := r.client.Status().Update(ctx, pizzaOrder)
		if statusErr != nil {
			log.Error(statusErr, "Failed to update PizzaOrder status")
		}
	}()

	// Check if order is already delivered
	if pizzaOrder.Status.Delivered {
		log.Info("Pizza order already delivered")
		return ctrl.Result{}, nil
	}

	// Check if order is already placed but not delivered
	if pizzaOrder.Status.Placed && !pizzaOrder.Status.Delivered {
		// Update tracking information
		if err := r.updateTracking(ctx, pizzaOrder); err != nil {
			log.Error(err, "Failed to update tracking information")
			return ctrl.Result{RequeueAfter: time.Minute * 2}, nil
		}
		return ctrl.Result{RequeueAfter: time.Minute * 2}, nil
	}

	// Process new order
	if pizzaOrder.Spec.PlaceOrder && !pizzaOrder.Status.Placed {
		// Find nearest store
		store, err := r.findNearestStore(pizzaOrder.Spec.Address)
		if err != nil {
			log.Error(err, "Failed to find nearest store")
			return ctrl.Result{RequeueAfter: time.Minute * 5}, nil
		}

		// Update store information
		pizzaOrder.Status.Store = &StoreStatus{
			ID:      store.StoreID,
			Address: store.Address,
		}

		// Create order
		order, err := r.createOrder(ctx, pizzaOrder, store.StoreID)
		if err != nil {
			log.Error(err, "Failed to create order")
			return ctrl.Result{RequeueAfter: time.Minute * 5}, nil
		}

		// Price the order
		price, err := r.priceOrder(order)
		if err != nil {
			log.Error(err, "Failed to price order")
			return ctrl.Result{RequeueAfter: time.Minute * 5}, nil
		}

		// Update price
		pizzaOrder.Status.Price = fmt.Sprintf("%.2f", price)

		// Get payment information
		payment, err := r.getPaymentInfo(ctx, pizzaOrder)
		if err != nil {
			log.Error(err, "Failed to get payment information")
			return ctrl.Result{RequeueAfter: time.Minute * 5}, nil
		}

		// Add payment to order
		order.Payments = []DominosPayment{payment}

		// Place order
		orderID, err := r.placeOrder(order)
		if err != nil {
			log.Error(err, "Failed to place order")
			return ctrl.Result{RequeueAfter: time.Minute * 5}, nil
		}

		// Update order status
		pizzaOrder.Status.OrderID = orderID
		pizzaOrder.Status.Placed = true
		pizzaOrder.Status.Tracker = &Tracker{
			Prep: time.Now().Format(time.RFC3339),
		}

		log.Info("Pizza order placed successfully", "orderID", orderID)
		return ctrl.Result{RequeueAfter: time.Minute * 2}, nil
	}

	return ctrl.Result{}, nil
}

// Find the nearest Dominos store
func (r *PizzaOrderReconciler) findNearestStore(address *Address) (*DominosStore, error) {
	// This function would call the Dominos API to find the nearest store
	// Implementation would make an actual API call to Dominos store locator endpoint

	// For now, return nil as we don't have a real implementation
	return nil, errors.New("not implemented: findNearestStore")
}

// Create a Dominos order
func (r *PizzaOrderReconciler) createOrder(ctx context.Context, pizzaOrder *PizzaOrder, storeID string) (*DominosOrder, error) {
	// Create Dominos order
	order := &DominosOrder{
		Address: DominosAddress{
			Street:     pizzaOrder.Spec.Address.Street,
			City:       pizzaOrder.Spec.Address.City,
			Region:     pizzaOrder.Spec.Address.Region,
			PostalCode: pizzaOrder.Spec.Address.PostalCode,
			Type:       "House",
		},
		Customer: map[string]string{
			"FirstName": pizzaOrder.Spec.Customer.FirstName,
			"LastName":  pizzaOrder.Spec.Customer.LastName,
			"Email":     pizzaOrder.Spec.Customer.Email,
			"Phone":     pizzaOrder.Spec.Address.Phone,
		},
		StoreID:  storeID,
		Products: []DominosOrderProduct{},
	}

	// Add pizzas to order
	for _, pizza := range pizzaOrder.Spec.Pizzas {
		// Map size to product code
		var productCode string
		switch strings.ToLower(pizza.Size) {
		case "small":
			productCode = "10SCREEN"
		case "medium":
			productCode = "12SCREEN"
		case "large":
			productCode = "14SCREEN"
		default:
			productCode = "14SCREEN"
		}

		// Create pizza product
		product := DominosOrderProduct{
			Code: productCode,
			Qty:  1,
			Options: map[string]map[string]string{
				"C": {"1/1": "1"}, // Normal cheese
				"X": {"1/1": "1"}, // Normal sauce
			},
		}

		// Add toppings
		for _, topping := range pizza.Toppings {
			var toppingCode string
			switch strings.ToLower(topping) {
			case "pepperoni":
				toppingCode = "P"
			case "sausage":
				toppingCode = "S"
			case "mushroom":
				toppingCode = "M"
			case "onion":
				toppingCode = "O"
			case "green_pepper", "green pepper":
				toppingCode = "G"
			case "bacon":
				toppingCode = "K"
			case "beef":
				toppingCode = "B"
			case "ham":
				toppingCode = "H"
			case "pineapple":
				toppingCode = "N"
			case "spinach":
				toppingCode = "Si"
			default:
				// Skip unknown toppings
				continue
			}

			// Add topping to pizza
			product.Options[toppingCode] = map[string]string{"1/1": "1"}
		}

		// Add product to order
		order.Products = append(order.Products, product)
	}

	return order, nil
}

func (r *PizzaOrderReconciler) priceOrder(order *DominosOrder) (float64, error) {
	// Call the Dominos API to price the order
	// Implementation would make an actual API call to Dominos pricing endpoint

	// For now, return a placeholder price
	return 0.0, nil
}

func (r *PizzaOrderReconciler) getPaymentInfo(ctx context.Context, pizzaOrder *PizzaOrder) (DominosPayment, error) {
	payment := DominosPayment{
		Type:      "CreditCard",
		Amount:    0, // Will be set based on order price
		TipAmount: 5, // $5 tip
	}

	// Get payment secret
	if pizzaOrder.Spec.PaymentSecret.Name == "" {
		return payment, errors.New("payment secret name is empty")
	}

	// Get secret
	secret := &corev1.Secret{}
	if err := r.client.Get(ctx, types.NamespacedName{
		Namespace: pizzaOrder.Namespace,
		Name:      pizzaOrder.Spec.PaymentSecret.Name,
	}, secret); err != nil {
		return payment, err
	}

	// Extract payment information
	payment.Number = string(secret.Data["Number"])
	payment.Expiration = string(secret.Data["Expiration"])
	payment.SecurityCode = string(secret.Data["SecurityCode"])
	payment.PostalCode = string(secret.Data["PostalCode"])

	// Set payment amount
	if pizzaOrder.Status.Price != "" {
		price, err := strconv.ParseFloat(pizzaOrder.Status.Price, 64)
		if err != nil {
			return payment, err
		}
		payment.Amount = price
	}

	return payment, nil
}

// Place the order
func (r *PizzaOrderReconciler) placeOrder(order *DominosOrder) (string, error) {
	// Call the Dominos API to place the order
	// Implementation would make an actual API call to Dominos ordering endpoint

	// For now, return an empty order ID
	return "", nil
}

func (r *PizzaOrderReconciler) updateTracking(ctx context.Context, pizzaOrder *PizzaOrder) error {
	// Call the Dominos API to get tracking information
	// Implementation would make an actual API call to Dominos tracking endpoint

	// For now, return without updating tracking
	return nil
}

func (r *PizzaOrderReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&PizzaOrder{}).
		Complete(r)
}

// Register the PizzaOrder type with the scheme
func init() {
	scheme := runtime.NewScheme()
	scheme.AddKnownTypes(schema.GroupVersion{Group: "pizza.bilalashraf.xyz", Version: "v1"}, &PizzaOrder{}, &PizzaOrderList{})
	metav1.AddToGroupVersion(scheme, schema.GroupVersion{Group: "pizza.bilalashraf.xyz", Version: "v1"})
}

func main() {
	// Set up logging
	log.SetLogger(zap.New())
	setupLog := ctrl.Log.WithName("setup")

	// Get Kubernetes config
	cfg, err := config.GetConfig()
	if err != nil {
		setupLog.Error(err, "unable to get kubeconfig")
		os.Exit(1)
	}

	// Create manager
	mgr, err := ctrl.NewManager(cfg, ctrl.Options{
		Scheme:             runtime.NewScheme(),
		MetricsBindAddress: ":8080",
		Port:               9443,
		LeaderElection:     false,
	})
	if err != nil {
		setupLog.Error(err, "unable to start manager")
		os.Exit(1)
	}

	// Register scheme
	scheme := mgr.GetScheme()
	scheme.AddKnownTypes(schema.GroupVersion{Group: "pizza.bilalashraf.xyz", Version: "v1"}, &PizzaOrder{}, &PizzaOrderList{})
	metav1.AddToGroupVersion(scheme, schema.GroupVersion{Group: "pizza.bilalashraf.xyz", Version: "v1"})

	// Create client
	client, err := client.New(cfg, client.Options{Scheme: scheme})
	if err != nil {
		setupLog.Error(err, "unable to create client")
		os.Exit(1)
	}

	// Create reconciler
	reconciler := &PizzaOrderReconciler{
		client: client,
		Log:    ctrl.Log.WithName("controllers").WithName("PizzaOrder"),
		Scheme: scheme,
	}

	// Set up controller
	if err := reconciler.SetupWithManager(mgr); err != nil {
		setupLog.Error(err, "unable to set up controller")
		os.Exit(1)
	}

	// Start manager
	setupLog.Info("starting manager")
	if err := mgr.Start(ctrl.SetupSignalHandler()); err != nil {
		setupLog.Error(err, "problem running manager")
		os.Exit(1)
	}
}
